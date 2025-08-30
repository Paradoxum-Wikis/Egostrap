const fs = require('fs');
const path = require('path');

const API_URL = "https://alter-ego.fandom.com/api.php";
const PAGE_TITLE = "MediaWiki:Egostrap.css";

class WikiCSSUploader {
  static botUsername = process.env.WIKI_BOT_USERNAME;
  static botPassword = process.env.WIKI_BOT_PASSWORD;
  static editToken = null;
  static cookie = null;

  static async apiRequest(params) {
    const response = await fetch(API_URL, {
      method: "POST",
      body: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: this.cookie || "",
      },
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookie = setCookie;
    }
    return response.json();
  }

  static async login() {
    const loginTokenParams = new URLSearchParams({
      action: "query",
      meta: "tokens",
      type: "login",
      format: "json",
    });
    const tokenData = await this.apiRequest(loginTokenParams);
    const loginToken = tokenData.query.tokens.logintoken;

    const loginParams = new URLSearchParams({
      action: "login",
      lgname: this.botUsername,
      lgpassword: this.botPassword,
      lgtoken: loginToken,
      format: "json",
    });
    const loginResult = await this.apiRequest(loginParams);

    if (loginResult.login.result !== "Success") {
      throw new Error("Login failed");
    }

    const csrfTokenParams = new URLSearchParams({
      action: "query",
      meta: "tokens",
      format: "json",
    });
    const csrfData = await this.apiRequest(csrfTokenParams);
    this.editToken = csrfData.query.tokens.csrftoken;
  }

  static async editPage(content, summary) {
    const params = new URLSearchParams({
      action: "edit",
      title: PAGE_TITLE,
      text: content,
      summary: summary,
      token: this.editToken,
      format: "json",
    });
    const data = await this.apiRequest(params);
    if (data.error) {
      throw new Error(`Failed to edit wiki page: ${data.error.info}`);
    }
  }

  static async uploadCSS() {
    if (!this.botUsername || !this.botPassword) {
      throw new Error("Wiki bot credentials not configured.");
    }

    const cssPath = path.join(__dirname, 'Egostrap.css');
    if (!fs.existsSync(cssPath)) {
      throw new Error("Compiled CSS file not found.");
    }

    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    await this.login();
    await this.editPage(cssContent, "Automated deploy from https://github.com/Paradoxum-Wikis/Egostrap");

    console.log("Successfully updated MediaWiki:Egostrap.css");
  }
}

WikiCSSUploader.uploadCSS().catch(console.error);