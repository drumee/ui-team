All common styles used globally are in **builtins/skin/global/common.scss**, those which were listed in last version of UI kit and can be found in common.scss:
[data-flow].input, .input - for inputs,
[data-flow].c-top-bar, .c-top-bar - for topbar
[data-flow].popup, .popup - for popups
[data-flow].btn - for buttons

Colors are predefined in builtins/mixins/colors.scss. Please use those, which are listed in /**named colors**/ block

Also there are fast using classes in block /***** UTILITIES ****/ which can allow not to add extra styles,
- flexbox classes
- margins/paddings
To see how they work inside you can check builtins/mixins/vendor.scss 

In vendor.scss you can find few more interesting mixing like 
@mixin placeholder-input
@mixin overflow-text

One more mixin is in builtins/mixins/typo.scss
@mixin typo

It is pretty simple, you can check it yourself.

For local styles there are some rules:
- please try not to use !important statement, if you use it mostly means that you use it in wrong place
- we use BEM based naming convention (https://en.bem.info/methodology/quick-start/). I already explained it before, will try to find manual for this later. As start:
1. block is block itself (.block)
2. elements is part of block (.block__element)
3. tag with element can be also block for some of his children (.search__field .field)
4. modificatory can be used only with element or block (.button--black)
5. this construction can’t be used alone ‘.button—black’, it should be part of this ‘.button.button—black’, since modificator only modificates element or block and not working as itself
6. currently I’m trying to avoid to use & (example
.preferences {
  &__language {
  }
} )
instead of this I write 
.preferences {
  .preferences__language {
  }
} )
second example is longer, but it is easier to find this css in code while developing, in future we will replace full naming to short with & in order to makes css lighter.
& is used only for &:after, &:before, &:hover etc 
7. please connect to css styles, not to tags, tags can be changed and it will brake your code 

If you have any question while writing css please do not hesitate to ask me
