#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const chalk = require('chalk');
const handlebars = require('handlebars');
const beautify = require('js-beautify').html;
const multiline = require('multiline');
const argv = require('minimist')(process.argv.slice(2));

// Matching an url() reference. To correct references broken by making ids unique to the source svg
const urlPattern = /url\(\s*#([^ ]+?)\s*\)/g;

// Default Template
const defaultTemplate = multiline.stripIndent(() => { /*
<!doctype html>
<html>
  <head>
    <style>
      svg{
       width:50px;
       height:50px;
       fill:black !important;
      }
    </style>
  </head>
  <body>
    {{{svg}}}

    {{#each icons}}
        <svg>
          <use xlink:href="#{{name}}" />
        </svg>
    {{/each}}

  </body>
</html>
*/});

// Default function used to extract an id from a name
const defaultConvertNameToId = (name) => {
  const dotPos = name.indexOf('.');
  if (dotPos > -1) {
    name = name.substring(0, dotPos);
  }
  return name;
};

/**
 * SVGStore class 
 */
class SVGStore {
  constructor(options = {}) {
    this.options = {
      prefix: options.prefix || '',
      svg: {
        xmlns: "http://www.w3.org/2000/svg",
        ...options.svg
      },
      symbol: { ...options.symbol },
      formatting: options.formatting || false,
      includedemo: options.includedemo || false,
      inheritviewbox: options.inheritviewbox || false,
      cleanupdefs: options.cleanupdefs || false,
      convertNameToId: options.convertNameToId || defaultConvertNameToId,
      fixedSizeVersion: options.fixedSizeVersion || false,
      externalDefs: options.externalDefs || false,
      includeTitleElement: options.includeTitleElement !== undefined ? options.includeTitleElement : true,
      preserveDescElement: options.preserveDescElement !== undefined ? options.preserveDescElement : true,
      cleanup: this._parseCleanupOptions(options.cleanup)
    };
  }

  /**
   * Parse cleanup options (backwards compatible with grunt-svgstore)
   */
  _parseCleanupOptions(cleanup) {
    if (cleanup && typeof cleanup === 'boolean') {
      // For backwards compatibility
      return ['style'];
    } else if (Array.isArray(cleanup)) {
      return cleanup;
    }
    return [];
  }

  /**
   * Get unique ID with prefix
   */
  _getUniqueId(oldId, fileId) {
    return fileId + "-" + oldId;
  }

  /**
   * Process a single SVG file
   */
  _processSVGFile(filepath, resultDefs, resultSvg, iconNameViewBoxArray) {
    if (!fs.existsSync(filepath)) {
      console.warn(chalk.yellow(`⚠️  File "${filepath}" not found.`));
      return false;
    }

    const filename = path.basename(filepath, '.svg');
    const id = this.options.convertNameToId(filename);
    const contentStr = fs.readFileSync(filepath, 'utf-8');
    
    // Load SVG with cheerio
    const $ = cheerio.load(contentStr, {
      normalizeWhitespace: true,
      xmlMode: true
    });

    // Remove empty g elements
    $('g').each(function() {
      const $elem = $(this);
      if (!$elem.children().length) {
        $elem.remove();
      }
    });

    // Map to store references from id to uniqueId + id
    const mappedIds = {};

    // Process all elements with IDs
    $('[id]').each((index, elem) => {
      const $elem = $(elem);
      const oldId = $elem.attr('id');
      const uid = this._getUniqueId(oldId, id);
      mappedIds[oldId] = {
        id: uid,
        referenced: false,
        $elem: $elem
      };
      $elem.attr('id', uid);
    });

    // Process all elements for attribute cleanup and URL references
    $('*').each((index, elem) => {
      const $elem = $(elem);
      const attrs = $elem.attr();

      Object.keys(attrs).forEach(key => {
        let value = attrs[key];
        let id, match;

        // Handle url() references
        while ((match = urlPattern.exec(value)) !== null) {
          id = match[1];
          if (mappedIds[id]) {
            mappedIds[id].referenced = true;
            $elem.attr(key, value.replace(match[0], 'url(#' + mappedIds[id].id + ')'));
          }
        }

        // Handle xlink:href references
        if (key === 'xlink:href') {
          id = value.substring(1);
          const idObj = mappedIds[id];
          if (idObj) {
            idObj.referenced = false;
            $elem.attr(key, '#' + idObj.id);
          }
        }

        // Handle attribute cleanup
        if (key !== 'id') {
          if (this.options.cleanupdefs || !$elem.parents('defs').length) {
            let preservedKey = '';
            
            if (key.match(/preserve--/)) {
              // Strip off the preserve--
              preservedKey = key.substring(10);
            }

            if (this.options.cleanup.indexOf(key) > -1 || this.options.cleanup.indexOf(preservedKey) > -1) {
              const isFillCurrentColor = key === 'fill' && $elem.attr('fill') === 'currentColor';
              const isStrokeCurrentColor = key === 'stroke' && $elem.attr('stroke') === 'currentColor';

              if (preservedKey && preservedKey.length) {
                // Add the new key preserving value
                $elem.attr(preservedKey, $elem.attr(key));
                // Remove the old preserve--foo key
                $elem.removeAttr(key);
              } else if (!(isFillCurrentColor || isStrokeCurrentColor)) {
                // Letting fill inherit the `currentColor` allows shared inline defs to
                // be styled differently based on an SVG element's `color` so we leave these
                $elem.removeAttr(key);
              }
            } else {
              if (preservedKey && preservedKey.length) {
                // Add the new key preserving value
                $elem.attr(preservedKey, $elem.attr(key));
                // Remove the old preserve--foo key
                $elem.removeAttr(key);
              }
            }
          }
        }
      });
    });

    // Clean up unused IDs
    if (this.options.cleanup.indexOf('id') > -1) {
      Object.keys(mappedIds).forEach(id => {
        const idObj = mappedIds[id];
        if (!idObj.referenced) {
          idObj.$elem.removeAttr('id');
        }
      });
    }

    const $svg = $('svg');
    const $title = $('title');
    const $desc = $('desc');
    const $def = $('defs').first();
    const defContent = $def.length ? $def.html() : null;

    // Merge defs from this svg into the result defs block
    if (defContent) {
      resultDefs.append(defContent);
    }

    const title = $title.first().html();
    const desc = $desc.first().html();

    // Remove def, title, desc from this svg
    if (filepath.includes('normalized')) {
      $def.remove();
    }
    $title.remove();
    $desc.remove();

    // If there is no title use the filename
    const finalTitle = title || id;

    // Generate symbol
    const $res = cheerio.load('<symbol>' + $svg.html() + '</symbol>', { xmlMode: true });
    const $symbol = $res('symbol').first();

    // Merge in symbol attributes from option
    for (const attr in this.options.symbol) {
      $symbol.attr(attr, this.options.symbol[attr]);
    }

    // Add title and desc (if provided)
    if (desc && this.options.preserveDescElement) {
      $symbol.prepend('<desc>' + desc + '</desc>');
    }

    if (finalTitle && this.options.includeTitleElement) {
      $symbol.prepend('<title>' + finalTitle + '</title>');
    }

    // Add viewBox (if present on SVG w/ optional width/height fallback)
    let viewBox = $svg.attr('viewBox');

    if (!viewBox && this.options.inheritviewbox) {
      const width = $svg.attr('width');
      const height = $svg.attr('height');
      const pxSize = /^\d+(\.\d+)?(px)?$/;
      if (pxSize.test(width) && pxSize.test(height)) {
        viewBox = '0 0 ' + parseFloat(width) + ' ' + parseFloat(height);
      }
    }

    if (viewBox) {
      $symbol.attr('viewBox', viewBox);
    }

    // Add ID to symbol
    const graphicId = this.options.prefix + id;
    $symbol.attr('id', graphicId);

    // Extract gradients and patterns to defs
    const addToDefs = function() {
      const $elem = $res(this);
      resultDefs.append($elem.toString());
      $elem.remove();
    };

    $res('linearGradient').each(addToDefs);
    $res('radialGradient').each(addToDefs);
    $res('pattern').each(addToDefs);

    // Append <symbol> to resulting SVG
    resultSvg.append($res.html());

    // Add icon to the demo.html array
    if (this.options.includedemo) {
      iconNameViewBoxArray.push({
        name: graphicId,
        title: finalTitle
      });
    }

    // Create fixed size version if requested
    if (viewBox && this.options.fixedSizeVersion) {
      this._createFixedSizeVersion(graphicId, viewBox, desc, finalTitle, resultSvg, iconNameViewBoxArray);
    }

    return true;
  }

  /**
   * Create fixed size version of an icon
   */
  _createFixedSizeVersion(graphicId, viewBox, desc, title, resultSvg, iconNameViewBoxArray) {
    const options = this.options.fixedSizeVersion;
    const fixedWidth = options.width || 50;
    const fixedHeight = options.height || 50;
    const $resFixed = cheerio.load('<symbol><use></use></symbol>', { lowerCaseAttributeNames: false });
    const fixedId = graphicId + (options.suffix || '-fixed-size');
    const $symbolFixed = $resFixed('symbol')
      .first()
      .attr('viewBox', [0, 0, fixedWidth, fixedHeight].join(' '))
      .attr('id', fixedId);

    // Copy symbol attributes
    for (const attr in this.options.symbol) {
      $symbolFixed.attr(attr, this.options.symbol[attr]);
    }

    if (desc && this.options.preserveDescElement) {
      $symbolFixed.prepend('<desc>' + desc + '</desc>');
    }
    if (title && this.options.includeTitleElement) {
      $symbolFixed.prepend('<title>' + title + '</title>');
    }

    const originalViewBox = viewBox
      .split(' ')
      .map(string => parseInt(string));

    const translationX = ((fixedWidth - originalViewBox[2]) / 2) + originalViewBox[0];
    const translationY = ((fixedHeight - originalViewBox[3]) / 2) + originalViewBox[1];
    const scale = Math.max(originalViewBox[2], originalViewBox[3]) /
                  Math.max(fixedWidth, fixedHeight);

    $symbolFixed
      .find('use')
      .attr('xlink:href', '#' + graphicId)
      .attr('transform', [
        'scale(' + parseFloat(scale.toFixed(options.maxDigits?.scale || 4)).toPrecision() + ')',
        'translate(' + [
          parseFloat(translationX.toFixed(options.maxDigits?.translation || 4)).toPrecision(),
          parseFloat(translationY.toFixed(options.maxDigits?.translation || 4)).toPrecision()
        ].join(', ') + ')'
      ].join(' '));

    resultSvg.append($resFixed.html());
    
    if (this.options.includedemo) {
      iconNameViewBoxArray.push({
        name: fixedId
      });
    }
  }

  /**
   * Include external defs file
   */
  _includeExternalDefs(externalDefsPath, resultDefs) {
    if (!fs.existsSync(externalDefsPath)) {
      console.error(chalk.red(`❌ File "${externalDefsPath}" not found.`));
      return false;
    }

    const $file = cheerio.load(fs.readFileSync(externalDefsPath, 'utf-8'), {
      xmlMode: true,
      normalizeWhitespace: true
    });

    const defs = $file('defs').html();

    if (defs === null) {
      console.warn(chalk.yellow(`⚠️  File "${externalDefsPath}" contains no defs.`));
    } else {
      resultDefs.append(defs);
    }

    return true;
  }

  /**
   * Generate demo HTML file
   */
  _generateDemo(destName, destDir, resultDocument, iconNameViewBoxArray) {
    const $resultSvg = resultDocument('svg').first();
    $resultSvg.attr('style', 'width:0;height:0;visibility:hidden;');

    let demoHTML;
    const viewData = {
      svg: resultDocument.html(),
      icons: iconNameViewBoxArray
    };

    if (typeof this.options.includedemo === 'function') {
      demoHTML = this.options.includedemo(viewData);
    } else {
      let template = defaultTemplate;
      if (typeof this.options.includedemo === 'string') {
        template = this.options.includedemo;
      }
      demoHTML = handlebars.compile(template)(viewData);
    }

    const demoPath = path.join(destDir, destName + '-preview.html');
    fs.writeFileSync(demoPath, demoHTML);
    console.log(chalk.cyan(`📄 Preview file created: ${demoPath}`));
  }

  /**
   * Build sprite from source files
   */
  build(srcFiles, destPath) {
    console.log(chalk.blue('\n🔨 Building SVG sprite...'));
    
    // Initialize result document
    const $resultDocument = cheerio.load('<svg><defs></defs></svg>', { xmlMode: true });
    const $resultSvg = $resultDocument('svg').first();
    const $resultDefs = $resultDocument('defs').first();
    const iconNameViewBoxArray = [];

    // Merge in SVG attributes from option
    for (const attr in this.options.svg) {
      $resultSvg.attr(attr, this.options.svg[attr]);
    }

    // Process each source file
    let processedCount = 0;
    srcFiles.forEach(filepath => {
      const success = this._processSVGFile(filepath, $resultDefs, $resultSvg, iconNameViewBoxArray);
      if (success) processedCount++;
    });

    // Include external defs if specified
    if (this.options.externalDefs) {
      this._includeExternalDefs(this.options.externalDefs, $resultDefs);
    }

    // Remove defs block if empty
    if ($resultDefs.html().trim() === '') {
      $resultDefs.remove();
    }

    // Generate final result
    let result = this.options.formatting 
      ? beautify($resultDocument.html(), this.options.formatting) 
      : $resultDocument.html();

    // Write sprite file
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.writeFileSync(destPath, result);
    console.log(chalk.green(`✅ Sprite created: ${destPath} (${processedCount} icons)`));

    // Generate demo if requested
    if (this.options.includedemo) {
      const destName = path.basename(destPath, '.svg');
      this._generateDemo(destName, destDir, $resultDocument, iconNameViewBoxArray);
    }

    return {
      destPath,
      iconCount: processedCount,
      demoGenerated: !!this.options.includedemo
    };
  }
}

// Configuration for your specific use case
const configs = {
  normalized: {
    src: path.join(__dirname, 'src/normalized/*.svg'),
    dest: path.join(__dirname, 'sprites/normalized.sprite.svg'),
    options: {
      prefix: '--icon-',
      cleanup: ['id', 'fill', 'stroke', 'style', 'class'],
      cleanupdefs: true,
      preserveDescElement: false,
      includeTitleElement: false,
      renameDefs: true,
      svg: {
        viewBox: '0 0 100 100',
        x: '0',
        y: '0',
        version: "1.1",
        preserveAspectRatio: "xMidYMid meet"
      },
      symbol: {
        viewBox: '0 0 100 100',
        x: '0',
        y: '0',
        version: "1.1",
        preserveAspectRatio: "xMidYMid meet"
      },
      includedemo: true,
      formatting: {
        indent_size: 2,
        indent_char: ' ',
        wrap_line_length: 120
      }
    }
  },
  raw: {
    src: path.join(__dirname, 'src/raw/*.svg'),
    dest: path.join(__dirname, 'sprites/raw.sprite.svg'),
    options: {
      prefix: '--icon-raw-',
      cleanupdefs: false,
      preserveDescElement: true,
      includeTitleElement: true,
      renameDefs: true,
      svg: {
        viewBox: '0 0 100 100',
        x: '0',
        y: '0',
        version: "1.1",
        preserveAspectRatio: "xMidYMid meet"
      },
      symbol: {
        viewBox: '0 0 100 100',
        x: '0',
        y: '0',
        version: "1.1",
        preserveAspectRatio: "xMidYMid meet"
      },
      includedemo: true
    }
  }
};

/**
 * Main build function
 */
async function buildSprites() {
  console.log(chalk.bold('='.repeat(60)));
  console.log(chalk.bold('🚀 SVG Sprite Builder'));
  console.log(chalk.bold('='.repeat(60)));

  const startTime = Date.now();
  const results = [];

  // Determine which configs to build
  let configsToBuild = configs;
  if (argv.type) {
    // Build only specified type
    if (configs[argv.type]) {
      configsToBuild = { [argv.type]: configs[argv.type] };
    } else {
      console.error(chalk.red(`❌ Unknown type: ${argv.type}`));
      process.exit(1);
    }
  }

  // Build each sprite
  for (const [name, config] of Object.entries(configsToBuild)) {
    try {
      console.log(chalk.yellow(`\n📋 Processing: ${name}`));
      
      // Get source files using glob pattern
      const glob = require('glob');
      const srcFiles = glob.sync(config.src);
      
      if (srcFiles.length === 0) {
        console.warn(chalk.yellow(`⚠️  No source files found for ${name}`));
        continue;
      }

      console.log(chalk.gray(`   Found ${srcFiles.length} source files`));

      const store = new SVGStore(config.options);
      const result = store.build(srcFiles, config.dest);
      results.push({ name, ...result });

    } catch (error) {
      console.error(chalk.red(`❌ Error building ${name}:`), error.message);
    }
  }

  // Print summary
  console.log(chalk.bold('\n' + '='.repeat(60)));
  console.log(chalk.bold('📊 Build Summary'));
  console.log(chalk.bold('='.repeat(60)));

  results.forEach(({ name, iconCount, destPath, demoGenerated }) => {
    const demo = demoGenerated ? ' + preview' : '';
    console.log(chalk.green(`✅ ${name}: ${iconCount} icons${demo}`));
    console.log(chalk.gray(`   └─ ${path.relative(process.cwd(), destPath)}`));
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.bold(`\n✨ Build completed in ${totalTime}s`));

  return results;
}

// Run if called directly
if (require.main === module) {
  // Install glob if not available
  try {
    require.resolve('glob');
    buildSprites().catch(error => {
      console.error(chalk.red('❌ Fatal error:'), error);
      process.exit(1);
    });
  } catch (e) {
    console.error(chalk.red('❌ Please install glob: npm install glob'));
    process.exit(1);
  }
}

module.exports = { SVGStore, configs, buildSprites };