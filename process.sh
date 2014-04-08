#!/bin/bash
echo $1 > process.log
cd /var/www/cbv/static/sessions/$1 && unzip *.zip &>>process.log
cd /var/www/cbv/static/sessions/$1 && unrar x *.rar &>>process.log
