/** ================================================================== *
#   Copyright Xialia.com  2011-<%= year %>
#   FILE : <%= filename %>
#   TYPE : Component style
# ===================================================================**/
@import 'mixins/drumee';

.<%= group %>-<%= name %>{
  &__ui{
    background-color: inherit;
    width:100%;
    width:100%;
  }
  &__main{
    background-color: inherit;
    width:100%;
    width:100%;
  }
  &__container{
    width:100%;
    width:100%;
    padding:20px;
    background-color: inherit;
    justify-content: center;
    align-items: center;
  }
  &__text{
    font-size: 14px;
    letter-spacing: 0em;
    line-height: 24px;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    color: #787B7F;
    font-family: "Roboto-Regular", sans-serif;
  }
  &__icon{
    height:25px;
    width:25px;
    padding:2px;
  }
}