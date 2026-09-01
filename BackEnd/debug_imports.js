console.log("START");
import('dotenv').then(d => {
  d.config();
  console.log("dotenv loaded");
  return import('http');
}).then(() => {
  console.log("http loaded");
  return import('express');
}).then(() => {
  console.log("express loaded");
  return import('./app.js');
}).then(() => {
  console.log("app.js loaded");
  return import('mongoose');
}).then(() => {
  console.log("mongoose loaded");
  return import('socket.io');
}).then(() => {
  console.log("socket.io loaded");
  return import('ws');
}).then(() => {
  console.log("ws loaded");
  return import('y-websocket/bin/utils');
}).then(() => {
  console.log("y-websocket loaded");
  return import('y-mongodb-provider');
}).then(() => {
  console.log("y-mongodb-provider loaded");
}).catch(err => {
  console.error("ERROR:", err);
});
