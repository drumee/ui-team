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
 * 2FA screen for an OAuth (Google / Apple) sign-in, using the shared dtk_otp
 * 6-box widget.
 *
 * Reached only via the hand-off loby's provider callback performs when the
 * resolved account has email 2FA enabled: the session is left pending
 * (cookie.status = 'otp_pending'), a code is emailed, and the browser is
 * bounced to #/welcome/signin?oauth_mfa=1&email=...
 *
 * Unlike ./otp.js and ./otp-reconnect.js, NO secret is carried here. The OTP
 * secret never leaves the server on this path: the widget submits only the six
 * digits, and oauth.verify_otp resolves the secret from the pending session
 * before promoting it via session_login_otp. Hence the empty-but-for-email
 * payload — do not add a `secret` to it.
 *
 * Resend is host-driven (`resendService`) rather than the widget's own POST: the
 * widget overwrites its `payload` with the resend response, which would drop the
 * email the message line is built from. See ../index.js -> _resendOauthOtp.
 *
 * The back link sits alongside the widget rather than inside it because
 * abandoning this screen needs server-side cleanup (oauth.cancel_otp) that
 * dtk_otp knows nothing about. Caller must ensure `dtk_otp` is registered
 * (Kind.waitFor).
 *
 * @param {LetcBox} ui  the welcome_signin instance
 * @param {string} email  address the code was sent to (already decoded)
 */
function __skl_welcome_signin_otp_oauth(ui, email = "") {
  const fig = ui.fig.family;
  const message = email
    ? (LOCALE.WE_HAVE_SENT_CODE || "We have sent a code to {0}").format(email)
    : (LOCALE.ENTER_CODE || "Enter the code we sent you");

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__items otp oauth`,
    kids: [
      {
        kind: "dtk_otp",
        sys_pn: "oauth-otp",
        api: SERVICE.oauth.verify_otp,
        // email is display copy only — verify_otp identifies the pending
        // sign-in from the session cookie, not from anything posted here.
        payload: { email, method: "oauth" },
        length: 6,
        charset: "numeric",
        resendService: "resend-oauth-otp",
        title: LOCALE.MULTI_FACTOR_AUTH || "Multi factor authentication",
        message,
        service: "oauth-otp-verified",
        uiHandler: [ui],
        dataset: { fit: "parent" },
      },
      Skeletons.Box.X({
        className: `${fig}__backlink-row`,
        kids: [
          Skeletons.Note({
            className: `${fig}__backlink`,
            content: LOCALE.BACK_TO_SIGN_IN || "← Back to sign in",
            service: "back-to-signin",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

module.exports = __skl_welcome_signin_otp_oauth;
