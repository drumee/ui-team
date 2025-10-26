/**
 * @license
 * Copyright 2024 Thidima SA. All Rights Reserved.
 * Licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
const __skl_goodbye = function(_ui_) {
  const goodByeFig = `${_ui_.fig.family}-goodbye`;
  
  const bg = Skeletons.Image.Smart({
    className : `${goodByeFig}__bg`,
    low     : "/-/images/background/welcome-wallpaper.png",
    high    : "/-/images/background/welcome-wallpaper.png"
  });

  const header = Skeletons.Box.X({
    className : `${goodByeFig}__header`,
    kids      : [
      Skeletons.Note({
        className : `${goodByeFig}__note header`,
        content   : LOCALE.GOODBYE_SEE_YOU_LATER
      }) //'You will be disconnected shortly. See you later !'
    ]});
  
  const content = Skeletons.Box.Y({
    className : `${goodByeFig}__container content`,
    sys_pn    : _a.loader,
    kids      : [{kind: 'spinner', mode: 'goodbye-loader'}]});

  const a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${goodByeFig}__main`,
    kids      : [
      bg,
      header,
      content
    ]});

  return a;
};

module.exports = __skl_goodbye;
