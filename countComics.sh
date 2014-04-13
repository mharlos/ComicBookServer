#!/bin/bash
cd $1
find -maxdepth 11 -type f |grep 'cbr' |wc -l
find -maxdepth 11 -type f |grep 'cbz' |wc -l
