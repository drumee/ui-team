#!/usr/bin/env /usr/bin/coffee
# ============== IMPORTED ================

fs = require('fs')
readline = require('readline')
stream = require('stream')
_ = require("underscore")


# ==============================
# 
# ==============================
usage = () ->
  console.log "Usage : coffe #{process.argv[1]} webpack-output-file"
  process.exit()


# ==============================
# 
# ==============================
getInputFile = () ->
  path = require('path')
  if not process.argv[2]?
    usage()
  res =
    file   : process.argv[2]
  return res
    



input = getInputFile()

readStream = fs.createReadStream(input.file)
airac_release = 0

rl = readline.createInterface
  input: readStream,
  terminal: false


# ==============================
# EVENTS HANDLERS
# ==============================

prev_sector = null
current_sector = null
points = []

writeStream = fs.createWriteStream('src/drumee/utils/test/modules-liste.coffee')
writeStream.write("__modules = \n");

# ------------------------------
# line parsing
# ------------------------------
parse = (line) ->
  if line.match(/\[([0-9]+)\].*drumee/)
    line = line.replace /src\/drumee/, ''
    line = line.replace /\.coffee.*$/, ''
    line = line.replace /[\[\]\.]/g, ''
    line = line.replace /[\/-]/g, '_'
    line = line.replace /( +)/g, ' '
    line = line.replace /__/, ''
    line = line.trim()
    r = line.split(/[ +]/)
    writeStream.write "  #{r[1]}:#{r[0]}\n"
# ------------------------------
# MAIN
# ------------------------------
rl.on 'line', parse

# ------------------------------
# error
# ------------------------------
readStream.on 'error', (err) ->
    console.log "ERREUR : Impossible d'ouvrir le fichier #{err.path}"
    process.exit()
    
# ------------------------------
# End of file
# ------------------------------
readStream.on 'end', (arg) ->
  writeStream.write "module.exports = __modules\n"
  writeStream.end()
