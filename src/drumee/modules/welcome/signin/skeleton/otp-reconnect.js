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

/**
 * Reconnect OTP screen using the shared dtk_otp 6-box widget (matches
 * dtk-otp__main). Used only in the reconnect popup; normal sign-in keeps
 * ./otp.js. The widget auto-submits the 6 digits to yp.authenticate and
 * routes the response to the host via `reconnect-otp-verified`; a rejected
 * code is shown inline below the boxes (no navigation). The built-in resend
 * link delegates to the host's existing `resend-otp` (re-runs yp.login) via
 * `resendService`. Caller must ensure `dtk_otp` is registered (Kind.waitFor).
 */
function __skl_welcome_signin_otp_reconnect(ui) {
  const otpFig = ui.fig.family;
  const secret = (ui.data && ui.data.secret) || Visitor.get("otp_key");

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${otpFig}__items otp reconnect`,
    kids: [
      {
        kind: "dtk_otp",
        sys_pn: "reconnect-otp",
        api: SERVICE.yp.authenticate,
        payload: { secret },
        length: 6,
        charset: "numeric",
        // dtk_otp's resend link triggers the host's existing resend-otp
        // (yp.login) instead of POSTing otp.send.
        resendService: "resend-otp",
        title: LOCALE.MULTI_FACTOR_AUTH,
        message: LOCALE.ENTER_CODE,
        service: "reconnect-otp-verified",
        uiHandler: [ui],
        dataset: { fit: "parent" },
      },
    ],
  });
}
module.exports = __skl_welcome_signin_otp_reconnect;
