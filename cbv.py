# Comic book Server
# A web application to serve and display digital comics 
# Supports CBR and CBZ
# 
# By Matt Harlos - 040514
#

# Make sure change the baseDir and comicDir variables
# Edit process.sh and change the paths
#
#


#!/usr/bin/python
from flask import Flask, session, request, render_template
from flask.sessions import SessionInterface
from beaker.middleware import SessionMiddleware
import subprocess
import os
import time
import random
import redis
session_opts = {
    'session.key': 'ComicBookServer',
    'session.type': 'redis',
    'session.url': '127.0.0.1:6379',
    'session.data_dir': './static/sessions/',
}

class BeakerSessionInterface(SessionInterface):
    def open_session(self, app, request):
        session = request.environ['beaker.session']
        return session

    def save_session(self, app, session, response):
        session.save()

app = Flask(__name__)
app.secret = "<somethingsupersecret>"
#GLOBALS
comicDir = "<full path to comics>"
LOG_FILE = "cbv.log"
isDir = False
isComic = False
useSessionAuth = True


#FUNCTIONS

## This function checks the query string params and determins if we are looking at a directory or a comic
def checkSessionStatus():
	keyMatch = False
	status = "LOGGEDOUT"
	if request.query_string:
		if 'betaKey' in request.query_string:
			with open("betaKeys") as authFile:
				keys = authFile.readlines()
			betaKey = request.args.get('betaKey')
			for key in keys:
				#print "-"+str(betaKey).replace("\n","") + "-" + str(key).replace("\n","") +"-"
				
				if str(betaKey).replace("\n","")  == str(key).replace("\n",""):
					keyMatch = True
					#print "Match"
					status = "LOGGEDIN"
			if not keyMatch:
				status = "INVALIDKEY"
		elif 'requestKey' in request.query_string:
			requestKey = request.args.get('requestKey')
			if 'requestComment' in request.query_string:
				requestComment = request.args.get('requestComment')
			else:
				requestComment = ""
			logData = str(requestKey) + " - " + str(requestComment) + "\n"
			with open("request.log", "a") as logFile: #open log file
                		logFile.write(logData) # write comic session
			status = "REQUESTKEY"
		else:
			status = "LOGGEDOUT"
			betaKey = "0000"
	else:
		status = "LOGGEDOUT"
	pStatus = "LOGGEDOUT"
	if not session.has_key('status'):
		session['status'] = status
		pStatus = "NOSESSION"
	else:
		pStatus = str(session['status'])
	if str(pStatus) == "LOGGEDIN":
		status = "LOGGEDIN"
	session['status'] = str(status)
	
	if str(status) == "LOGGEDIN":
		return "LOGGEDIN"
	elif str(status) == "LOGGEDOUT":
		return "LOGGEDOUT"
	elif str(status) == "INVALIDKEY":
		return "INVALIDKEY"
	elif str(status) == "REQUESTKEY":
		return "REQUESTKEY"
def endSession():
        session['status'] = "LOGGEDOUT"

def checkQuery():
	global isDir
	global isComic
	if useSessionAuth:
		if not session.has_key('lastPath'):
			session['lastPath'] = "--HOME--"
		if not session.has_key('lastComic'):
			session['lastComic'] = "--NONE--"
	if request.query_string:
		if 'dir' in request.query_string: # is directory
			dirQuery = request.args.get('dir')
			dirPath = str(dirQuery).replace("--and--","/") # used "--and--"" to seperate directories - replace that with "/"
			isDir = True
			if useSessionAuth:
				session['lastPath'] = dirQuery
			return dirPath  #return directory path
		if 'comic' in request.query_string: # is a comic
			#print "Loading a comic"
			comicPath = request.args.get('comic')
			if useSessionAuth:
				#print "-Setting Last Comic\n"
                                session['lastComic'] = comicPath
				#print comicPath
			cSession = startComicSession(comicPath) #start a comic session
			isComic = True
			return cSession # return output of comic session
	else:
		session['lastPath'] = "--HOME--"	
	return False

## this function initiates a session for reading a comic
def startComicSession(comicPath):
	sessionNumber = 0 # sessions start at 0 and are incremented by 1
	sessionDir = ""
	comicPath = comicDir + comicPath.replace("--h--","#") #path to comic in comicDir 
	
	#LOGGING
	ip = str(request.remote_addr) #get IP
	session['ip'] = str(ip)
	n = time.strftime("%d/%m/%Y-%H:%M:%S") # get timedate now 
	logData = n + "\t" + ip + "\t" + comicPath + "\n" # what to write to the log
	with open("access.log", "a") as logFile: #open log file
    		logFile.write(logData) # write comic session
	
	i = 0 # flag for having initiated a session 0 = false or no session
	while i != 1:
		sessionDir = "static/sessions/" + str(sessionNumber) # checks to see if sessionnumber already exists
		if os.path.exists(sessionDir): # session exists
			sessionNumber += 1 # try next session number
		else: # not a session 
			os.makedirs(sessionDir) # create session dir 
			thisSession = sessionNumber # set session number
			session['sessionNumber'] = thisSession
			i =1 # session flag = true
	sessionDir = sessionDir + "/" # full path to session folder
	p = subprocess.Popen(["cp", comicPath, sessionDir ], stdout=subprocess.PIPE, stderr=subprocess.PIPE) # copy comic to session folder
	output, err = p.communicate() # execute command
	listSessionDir = os.listdir(sessionDir) # get a list of what is in the session dir - should have a cbr or cbz in there now
	for i in listSessionDir: # for each item in session dir
		if "cbr" in i: # if cbr 
			iFile = sessionDir + i # path of cbr
			rFile = sessionDir + i.replace("cbr","rar") # new rar file
			rFile = rFile.replace(" ","_") # remove spaces
			p = subprocess.Popen(["cp", iFile, rFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE) # create rar
			output, err = p.communicate() #execute command
			zFile = sessionDir + i.replace("cbr","zip") # new zip file
			zFile = zFile.replace(" ","_") # remove spaces
			p = subprocess.Popen(["cp", iFile, zFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE) # create zip 
			output, err = p.communicate() # execute command
		elif "cbz" in i: # of cbz
			iFile = sessionDir + i # path of cbz
			rFile = sessionDir + i.replace("cbz","rar") # new rar
			rFile = rFile.replace(" ","_") # remove spaces
			p = subprocess.Popen(["cp", iFile, rFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE) # create rar
			output, err = p.communicate() # execute command
			zFile = sessionDir + i.replace("cbz","zip") # new zip 
			zFile = zFile.replace(" ","_") # remove spaces
			p = subprocess.Popen(["cp", iFile, zFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE) # create zip 
			output, err = p.communicate() #execute command
		else:
			return "Not A Format I Know" #Hopefully this doesnt happen, we shouldnt have anything but cbr and cbz in here
		p = subprocess.Popen(["./process.sh", str(thisSession)], stdout=subprocess.PIPE, stderr=subprocess.PIPE) # This process.sh unzips and unrars the comic
		output, err = p.communicate() # execute command
		x = os.listdir(sessionDir) # get a list of items in session dir
		y = makeComicLinks(x, sessionDir, thisSession) # display the comic
	return y # return the resuts of makeComicLinks

def makeComicLinks(dirList, sessionDir, thisSession):
	#images = "<a class=\"cbrLink button clickable\" onclick=\"window.history.go(-2);\" href=\"#\">Back to Comics</a><br>"
	images = ""
	jpegList = [] # Empty list for holding a list of images that make up the comic
	for i in dirList: # check the session dir for images
		if "jpg" in i or "JPG" in i or "jpeg" in i or "JPEG" in i or "gif" in i or "png" in i: # found an image
			jpegList.append(i) # append the image to the jpegList
		else: # not an image. Proabably a DIR
			if os.path.isdir(sessionDir + i): # if it is a DIR
				subx = os.listdir(sessionDir + i) # get a list of whats in there
				l = makeComicLinks(subx, sessionDir + i, thisSession) # try to display the comic again with the new dir as the dirlist 
				images += l # l should equal a bunch of IMG tags for every jpg in the folder
	for v in sorted(jpegList): # sort list of images ## THIS COULD BE DONE WAY BETTER 
		images += '<img src="/%s/%s" width="100%%"><br>' % (sessionDir, v) #creates IMG tag
	#images += "<a class=\"cbrLink button clickable\" onclick=\"window.history.go(-2);\" href=\"#\">Back to Comics</a><br>"
	return render_template('comic.html', images=images) # renders comic.html and sends a string of all the IMG tags for every img in the session dir

def makeLinks(dirList):
	dList = [] # empty list for directories
	cList = []
	links = ""
	for i in dirList: #for each item in the dir
		if "cbz" in i or "cbr" in i: # if it is a comic
			#if 'dir' in request.query_string: # are we already in a direcotry 
			#	dirQuery = request.args.get('dir') # current directory 
			#	actualDir = dirQuery.replace("--and--","/") #current directory with all "--and-- replaced with "/""
			#	link = request.base_url + "?comic=" + actualDir + "/" + str(i).replace("#","--h--") #generates link for a comic 
			#else: # ot already in a directory 
			#	link = request.base_url + "?comic=" + i # generates link for a comic
			# creates the anchor tag 	  
			#links += '<a class="cbrLink button clickable" href="%s" onclick="showLoading();">%s</a>' % (link, i.replace(".cbz","").replace(".cbr","").replace("_"," ").replace("-"," "))
			cList.append(i)
		elif not "DS_Store" in i and not "restricted" in i and not "thumbs" in i: # dont show
					dList.append(i) # append dir name to dir list
	cList.sort()
	#print cList
	for k in cList:
		if 'dir' in request.query_string: # are we already in a direcotry
        		dirQuery = request.args.get('dir') # current directory
               		actualDir = dirQuery.replace("--and--","/") #current directory with all "--and-- replaced with "/""
               		link = request.base_url + "?comic=" + actualDir + "/" + str(k).replace("#","--h--") #generates link for a comic
        	else: # ot already in a directory
                	link = request.base_url + "?comic=" + k # generates link for a comic
                	# creates the anchor tag
        	links += '<a class="cbrLink button clickable" href="%s" onclick="showLoading();">%s</a>' % (link, k.replace(".cbz","").replace(".cbr","").replace("_"," ").replace("-"," ")) 
	dList.sort()
	#print dList
	for l in dList: # attempt to sort dir list  ## THIS COULD BE DONE WAY BETTER - THIS DOESNT WORK
		if 'dir' in request.query_string: # are we already in a dir 
			dirQuery = request.args.get('dir') # get currrent dir 
			link = request.base_url + "?dir=" + dirQuery + "--and--" + l # current dir "--and--"new dir - This keeps the higherarchy for later
		else: # not already in a dir 
			link = request.base_url + "?dir=" + l # current dir
		##generate href
		links += '<a class="dirLink button clickable" href="%s">%s</a>' % (link, l.replace("_"," ").replace("-"," "))
	bgpic = "/static/images/backgrounds/back" + str(random.randint(1,7)) + ".jpg"
	if useSessionAuth:
		lastComic = session['lastComic']
		#print "Getting Last Comic - "
		#print lastComic
	else:
		#print "No session means no last comic\n"
		lastComic = "--NONE--" 
	#print "\n--NONE--" + ":" + str(lastComic) + ":"
	if lastComic == "--NONE--":
		lComic = ""
	else:
		pComic = str(lastComic).split("/")
		pLen = len(pComic)
		tComic = str(pComic[pLen-1]).replace(".cbz","").replace(".cbr","")
		lComic = "<p style='color:yellow;'>The Last Comic You Read Was: " + str(tComic).replace("--h--","#").replace("_"," ").replace("-"," ") + "</p>" 
	return render_template('list.html', links=links, bg=bgpic, lc=lComic) # render list.html , pass it a list of anchor tags for every dir and comic

#ENDPOINTS
@app.route('/') # main endpoint
def preload():
	return render_template('init.html')

@app.route('/welcome.html') # main endpoint
def front():
	numComics = 10000
	#try:
		#p = subprocess.Popen(["./countComics.sh", comicDir],stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		#output, err = p.communicate()
		#nums = str(output).split("\n")
		#numCbr = int(nums[0])
		#numCbz = int(nums[1])
		#numComics = numCbr + numCbz
	#except:
		#numComics = 9999
	strComics = str(numComics) + "+"
	bgsong = "/static/music/m" + str(random.randint(1,8)) + ".mp3"
	if useSessionAuth:
		sStatus = checkSessionStatus()
		if str(sStatus) == "LOGGEDIN":
			if session.has_key('lastPath'):
				tQuery = session['lastPath']
				if str(tQuery) != "--HOME--":
					aQuery = "?dir=" + str(tQuery)
				else:
					aQuery = ""
			else:
				aQuery = ""
			authLink = '<a style="width:600px;" class="cbrLink button clickable" href="/index.html' + str(aQuery) +'">Take Me To The Comics</a>'
		elif str(sStatus)=="LOGGEDOUT":
			authLink = '<form action="welcome.html" method="get">Beta Key:  <input type="password" name="betaKey"><br><input type="submit" value="Login"></form><input type=button value="Request a Beta Key" onclick="document.getElementById(\'requestBeta\').style.display=\'\'"></input>'
		elif str(sStatus) == "INVALIDKEY":
			authLink = '<p style="color:red;">Invalid Key</p><form action="welcome.html" method="get">Beta Key:<br><input type="password" name="betaKey"> <input type="submit" value="Login"></form><input type=button value="Request a Beta Key" onclick="document.getElementById(\'requestBeta\').style.display=\'\'"></input>'
		elif str(sStatus) == "REQUESTKEY":
			authLink = '<p style="color:yellow;">Your request has been submited !<br>Keep an eye out for an email with your beta key</p><form action="welcome.html" method="get">Beta Key:<br><input type="password" name="betaKey"><input type="submit" value="Login"></form>'
	else:
		authLink= '<a style="width:600px;" class="cbrLink button clickable" href="/index.html">Take Me To The Comics</a>'
	return render_template('front.html', bg=bgsong, nc=strComics, loggedin=authLink)

@app.route('/index.html') # main endpoint
def index():
	if useSessionAuth:
		sStatus = checkSessionStatus()
		if str(sStatus) != "LOGGEDIN":
			return render_template('init.html')
	global isDir
	global isComic
	query = checkQuery() # check query strings / decide what to do 
	if query == False: # no query string
		thisDir = os.listdir(comicDir) # current dir = comic dir root 
		links = makeLinks(thisDir) # create links for current dir
		return links # should be list.html
	if isDir: # we are in a directory 
		isDir = False # clear flag 
		thePath = comicDir + query # get dir we are in 
		thisDir = os.listdir(thePath) # get a list of what is in the dir
		links = makeLinks(thisDir) # create links for dir we are in
		return links # should be list.html
	if isComic: # its a comic 
		isComic = False # clear flag
		return query # should be comic.html
	return query # catch all

@app.route('/test.html') # main endpoint
def addcomic():
	session = checkSessionStatus()
	return "<html><body>"+ str(session) + "</body></html>"
@app.route('/request.html') # main endpoint
def requestComic():
	comic = ""
	if request.query_string:
		if 'comic' in request.query_string: # is directory
			comic = request.args.get('comic')
			with open("static/request.txt", "a") as reqfile:
				reqfile.write(str(comic) + "\n")
		else:
			with open("static/request.txt", "a") as reqfile:
                                reqfile.write("EMPTY REQUEST\n")
	else:
		with open("static/request.txt", "a") as reqfile:
                                reqfile.write("EMPTY REQUEST\n")
        return render_template('/successSubmit.html')

@app.route('/issue.html') # main endpoint
def reportIssues():
        comic = ""
	issue = ""
        if request.query_string:
                if 'comic' in request.query_string: # is directory
                        comic = request.args.get('comic')
			if 'issue' in request.query_string:
				issue = request.args.get('issue')
				comic = comic + "\t" + issue
                        with open("static/issue.txt", "a") as reqfile:
                                reqfile.write(str(comic) + "\n")
                else:
			if 'issue' in request.query_string:
                                issue = request.args.get('issue')
			else:
				issue = "EMPTY REQUEST\n"
                        with open("static/issue.txt", "a") as reqfile:
                                reqfile.write(issue)
        else:
                with open("static/issue.txt", "a") as reqfile:
                                reqfile.write("EMPTY REQUEST\n")
        return render_template('/successSubmit.html')

	#return comic
@app.route('/logout.html')
def logout():
	endSession()
	return render_template('/init.html')
	


#ERROR HANDLING
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404 # render 404.html for 404 errors
@app.errorhandler(403)
def access_denied(e):
    return render_template('403.html'), 403 # render 403.html for 403 errors
@app.errorhandler(500)
def server_error(e):
    return render_template('403.html'), 500 # render 403.html for 500 errors
#if __name__ == '__main__':
app.wsgi_app = SessionMiddleware(app.wsgi_app, session_opts)
app.session_interface = BeakerSessionInterface()
#app.run(debug = True, host='0.0.0.0',port=8080) #DEBUG is off , HOST = listen all , port = port to listen on
