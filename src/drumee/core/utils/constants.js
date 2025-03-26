export const STATE = {
  1: 1,
  on: 1,
  in: 1,
  yes: 1,
  true: 1,
  sms: 1,
  0: 0,
  off: 0,
  out: 0,
  no: 0,
  fasle: 0,
  undefined: 0,
  null: 0,
};

export const RADIO = {
  1: _a.on,
  on: _a.on,
  in: _a.on,
  yes: _a.on,
  true: _a.on,
  0: _a.off,
  off: _a.off,
  out: _a.off,
  no: _a.off,
  fasle: _a.off,
  undefined: _a.off,
  null: _a.off,
};

export const BOOLEAN = {
  1: true,
  on: true,
  in: true,
  yes: true,
  true: true,
  0: false,
  off: false,
  out: false,
  no: false,
  fasle: false,
  undefined: false,
  null: false,
};

export const LOG_LEVEL = {
  info: 2,
  debug: 3,
  verbose: 4,
  gossip: 5
}

export const LOG_NAME = {
  info: 'info', 
  debug: 'debug', 
  verbose: 'verbose', 
  gossip: 'gossip'
}