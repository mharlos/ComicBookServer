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
from flask import Flask, request, render_template
import subprocess
import os
import time
import random

app = Flask(__name__)

#GLOBALS
baseDir = "<full path to the folder this script is in>"
comicDir = "<full path to comics folder>"
LOG_FILE = "cbv.log"
isDir = False
isComic = False


#FUNCTIONS

## This function checks the query string params and determins if we are looking at a directory or a comic
def checkQuery():
	global isDir
	global isComic
	if request.query_string:
		if 'dir' in request.query_string: # is directory
			dirQuery = request.args.get('dir')
			dirPath = str(dirQuery).replace("--and--","/") # used "--and--"" to seperate directories - replace that with "/"
			isDir = True
			return dirPath  #return directory path
		if 'comic' in request.query_string: # is a comic
			comicPath = request.args.get('comic')
			cSession = startComicSession(comicPath) #start a comic session
			isComic = True
			return cSession # return output of comic session
	return False

## this function initiates a session for reading a comic
def startComicSession(comicPath):
	sessionNumber = 0 # sessions start at 0 and are incremented by 1
	sessionDir = ""
	comicPath = comicDir + comicPath.replace("--h--","#") #path to comic in comicDir 
	
	#LOGGING
	ip = str(request.remote_addr) #get IP
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
	for l in sorted(jpegList): # sort list of images ## THIS COULD BE DONE WAY BETTER 
		images += '<img src="/%s/%s" width="100%%"><br>' % (sessionDir, l) #creates IMG tag
	return render_template('comic.html', images=images) # renders comic.html and sends a string of all the IMG tags for every img in the session dir

def makeLinks(dirList):
	dList = [] # empty list for directories
	links = ""
	for i in dirList: #for each item in the dir
		if "cbz" in i or "cbr" in i: # if it is a comic
			if 'dir' in request.query_string: # are we already in a direcotry 
				dirQuery = request.args.get('dir') # current directory 
				actualDir = dirQuery.replace("--and--","/") #current directory with all "--and-- replaced with "/""
				link = request.base_url + "?comic=" + actualDir + "/" + str(i).replace("#","--h--") #generates link for a comic 
			else: # ot already in a directory 
				link = request.base_url + "?comic=" + i # generates link for a comic
			# creates the anchor tag 	  
			links += '<a class="cbrLink button clickable" href="%s" onclick="showLoading();">%s</a>' % (link, i.replace(".cbz","").replace(".cbr","").replace("_"," ").replace("-"," "))
		elif not "DS_Store" in i and not "restricted" in i: # dont show
					dList.append(i) # append dir name to dir list 
	for l in sorted(dList): # attempt to sort dir list  ## THIS COULD BE DONE WAY BETTER - THIS DOESNT WORK
		if 'dir' in request.query_string: # are we already in a dir 
			dirQuery = request.args.get('dir') # get currrent dir 
			link = request.base_url + "?dir=" + dirQuery + "--and--" + l # current dir "--and--"new dir - This keeps the higherarchy for later
		else: # not already in a dir 
			link = request.base_url + "?dir=" + l # current dir
		##generate href
		links += '<a class="dirLink button clickable" href="%s">%s</a>' % (link, l.replace("_"," ").replace("-"," "))
	bgpic = "/static/images/backgrounds/back" + str(random.randint(1,7)) + ".jpg"
	return render_template('list.html', links=links, bg=bgpic) # render list.html , pass it a list of anchor tags for every dir and comic

#ENDPOINTS
@app.route('/') # main endpoint
def front():
	bgsong = "/static/music/m" + str(random.randint(1,8)) + ".mp3"
	return render_template('front.html', bg=bgsong)

@app.route('/index.html') # main endpoint
def index():
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
	return "<html><body>HERE</body></html>"
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
	#return comic
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
if __name__ == '__main__':
	app.run(debug = True, host='0.0.0.0',port=8086) #DEBUG is off , HOST = listen all , port = port to listen on
