#!/bin/bash
#This file is what unpacks the comics - make sure it is in the same dir as the python script. REQUIRES : unzip, unrar

echo $1 > process.log
cd /var/www/cbv/static/$1 && unzip *.zip &>>process.log
cd /var/www/cbv/static/$1 && unrar x *.rar &>>process.log
