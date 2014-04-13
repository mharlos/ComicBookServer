#!/usr/bin/python

from tornado.wsgi import WSGIContainer
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from cbv import app

http_server = HTTPServer(WSGIContainer(app))
http_server.listen(8086)
IOLoop.instance().start()
