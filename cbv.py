#!/usr/bin/python
from flask import Flask, jsonify
from flask import abort
from flask import make_response
from flask import request
import json
import string
import random
import subprocess
import os
import urllib
import zipfile
import os.path
from flask import render_template
import pipes

app = Flask(__name__)

#GLOBALS
baseDir = "<path to the folder the script is in with a trailing />"
comicDir = "<path to comics folder>"
staticDir = "<path to static folder. this is where comics will be unpacked>"
isDir = False
isComic = False


#FUNCTIONS
def checkQuery():
	global isDir
	global isComic
	s = ""
	if request.query_string:
		if 'dir' in request.query_string:
			dirQuery = request.args.get('dir')
			dirPath = str(dirQuery).replace("--and--","/")
			isDir = True
			return dirPath
		if 'comic' in request.query_string:
			comicPath = request.args.get('comic')
			cSession = startComicSession(comicPath)
			isComic = True
			return cSession
	return False
def quote_argument(argument):
    return '"%s"' % (
        argument
        .replace('\\', '\\\\')
        .replace('"', '\"')
        .replace('$', '\$')
        .replace('`', '\`')
    )

def startComicSession(comicPath):
	sessionNumber = 0 
	sessionDir = ""
	comicPath = comicDir + comicPath.replace("--h--","#")
	i = 0
	while i != 1:
		sessionDir = staticDir + str(sessionNumber)
		if os.path.exists(sessionDir):
			sessionNumber += 1
		else:
			os.makedirs(sessionDir)
			thisSession = sessionNumber
			i =1
	sessionDir = sessionDir + "/"
	p = subprocess.Popen(["cp", comicPath, sessionDir ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	output, err = p.communicate()
	listSessionDir = os.listdir(sessionDir)
	for i in listSessionDir:
		if "cbr" in i:
			iFile = sessionDir + i
			rFile = sessionDir + i.replace("cbr","rar")
			rFile = rFile.replace(" ","_")
			p = subprocess.Popen(["cp", iFile, rFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			output, err = p.communicate()
			zFile = sessionDir + i.replace("cbr","zip")
			zFile = zFile.replace(" ","_")
			p = subprocess.Popen(["cp", iFile, zFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			output, err = p.communicate()
		elif "cbz" in i:
			iFile = sessionDir + i
			rFile = sessionDir + i.replace("cbz","rar")
			rFile = rFile.replace(" ","_")
			p = subprocess.Popen(["cp", iFile, rFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			output, err = p.communicate()
			zFile = sessionDir + i.replace("cbz","zip")
			zFile = zFile.replace(" ","_")
			p = subprocess.Popen(["cp", iFile, zFile ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			output, err = p.communicate()
		else:
			return "Not A Format I Know"
		p = subprocess.Popen(["./process.sh", str(thisSession)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		output, err = p.communicate()
		x = os.listdir(sessionDir)
		y = makeComicLinks(x, sessionDir, thisSession)
	return y

def makeComicLinks(dirList, sessionDir, sessionNumber):
	t = request.base_url
	if "172.14" in str(t) or "hoth.system" in str(t):
        	staticUrl = "http://172.14.0.103/cbv/"
	else:   
        	staticUrl = "http://thisinformation.doesntexist.org:9999/cbv/"
	s = "<html><body bgcolor=black>"
	jpegList = []
	for i in dirList:
		if "jpg" in i or "JPG" in i or "jpeg" in i or "JPEG" in i:
			jpegList.append(i)
		else:
			if os.path.isdir(sessionDir + i):
				subx = os.listdir(sessionDir + i)
				l = makeComicLinks(subx, sessionDir + i, sessionNumber)
				s += l
	for l in sorted(jpegList):
		link = staticUrl + sessionDir.replace("/var/www/cbv/","") + "/" + l
		s+="<img src='" + link + "' width=100% img><br>"
	s+="</body></html>"
	return s

def makeLinks(dirList):
	dList = []
	s = "<html><body bgcolor=black>"
	t = request.base_url

	#CHANGE TO YOUR SETTINGS
	if "<first two octetc of the local subnet xxx.xxx>" in str(t) or "<local domain name>" in str(t):
                staticUrl = "<internal address>"
        else:
                staticUrl = "<external address>"


	staticLogo = staticUrl + "logo.jpg"
	staticLoading = staticUrl + "loading.gif"
	s += "<center><img height=200px width=80% src=" + staticLogo + "></img></center>"
	s += "<center><h2 style='color:white;'>Underground Comics</h2></center>"
	s += "<center><div id='loading' style='display:none;'><img width=70% height=300px src='" + staticLoading + "'></img></div></center>"
	for i in dirList:
		if "cbz" in i or "cbr" in i:
			fullUrl = request.url
			if 'dir' in request.query_string:
				dirQuery = request.args.get('dir')
				actualDir = dirQuery.replace("--and--","/")
				link = request.base_url + "?comic=" + actualDir + "/" + str(i).replace("#","--h--")
			else:
				link = request + "?comic=" + i
			s+="<a href='" + link + "' border=5><button onclick='document.getElementById(\"loading\").style.display=\"\"' style='width:100%;height:50;background-color:yellow;-moz-border-radius: 15px;border-radius: 15px;' type='button'>" + i.replace(".cbz","").replace(".cbr","") + "</button></a><br>"
		else:
			if not "DS_Store" in i:
				if not "restricted" in i:
					dList.append(i)
	for l in sorted(dList):
		fullUrl = request.url
		if 'dir' in request.query_string:
			dirQuery = request.args.get('dir')
			link = request.base_url + "?dir=" + dirQuery + "--and--" + l
		else:
			link = request.base_url + "?dir=" + l
		s+="<a href='" + link + "' border=5><button style='width:100%;height:50;-moz-border-radius: 15px;border-radius: 15px;' type='button'>" + l + "</button></a><br>"
	s+="<br><br><h5>written and designed by Matt<br>Hoth Server<br>He who whould eat the kernel must first crack the shell</h5></body></html>"
	return s

#ENDPOINTS
@app.route('/index.html')
def index():
	global isDir
	global isComic
	query = checkQuery()
	if query == False:
		thisDir = os.listdir(comicDir)
		links = makeLinks(thisDir)
		return links
	if isDir:
		isDir = False
		thePath = comicDir + query
		thisDir = os.listdir(thePath)
		links = makeLinks(thisDir)
		return links
	if isComic:
		isComic = False
		return query
	return query





if __name__ == '__main__':
	app.run(debug = True, host='0.0.0.0',port=8085)
