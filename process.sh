#!/bin/bash
echo $1 > process.log
cd <full path to folder this script is in>/static/sessions/$1 && unzip *.zip &>>process.log
cd <full path to folder this script is in>/static/sessions/$1 && unrar x *.rar &>>process.log
