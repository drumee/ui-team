// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/lex/routes
//   TYPE : 
// ==================================================================== *

const a  = {
  bo               : {
    home           : '#!bo'
  },
  explorer         : '#!explorer',
  desk             : {
    main           : '#!desk',
    video          : '#!gallery/video'
  },
  gallery          : {
    image          : '#!gallery/image',
    video          : '#!gallery/video'
  },
  dede             : {
    edit           : '#!dede/edit'
  },
  creator             : {
    edit           : '#!creator/edit'
  },
  designer         : {
    background     : {
      image        : '#!designer/background?image',
      video        : '#!designer/background?video'
    },
    page           : '#!designer/page',
    edit           : '#!designer/edit',
    media          : {
      file         : '#!designer/media?file',
      image        : '#!designer/media?image',
      video        : '#!designer/media?video',
      document     : '#!designer/media?document'
    },
    style          : '#!designer/style',
    widget         : '#!designer/widget'
  }
};
module.exports = a;
