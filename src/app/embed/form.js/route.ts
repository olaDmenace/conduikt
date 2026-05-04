import { NextRequest, NextResponse } from "next/server";

// Serves the lead-capture embed widget as text/javascript at /embed/form.js.
//
// Usage on a customer's site:
//   <div data-conduikt-form="<form_id>"></div>
//   <script src="https://conduikt.com/embed/form.js" defer></script>
//
// The script auto-discovers every `[data-conduikt-form]` element, fetches
// each form's public config from /api/forms/<id>/config, renders an HTML
// form into the placeholder, and POSTs to /api/forms/<id>/submit on
// submit. On success it shows the configured thank-you message or
// redirects.
//
// We render this as a route handler (rather than a static asset under
// /public) so the API base URL can be derived from the deployment's host
// at request time — keeps dev/staging/prod self-contained.

function buildEmbedJs(baseUrl: string): string {
  // The script body. Single-quoted template so we don't have to escape
  // backticks inside. baseUrl is the only interpolation.
  return `(function () {
  "use strict";
  var BASE = "${baseUrl}";
  var FIELD_STYLE =
    "display:block;width:100%;padding:10px 12px;border:1px solid #d6cfc6;border-radius:8px;font:14px/1.4 system-ui,-apple-system,sans-serif;color:#1a1714;background:#fff;box-sizing:border-box;margin-bottom:10px;";
  var BUTTON_STYLE =
    "display:block;width:100%;padding:12px 16px;background:#C88540;color:#fff;border:0;border-radius:8px;font:600 14px/1 system-ui,-apple-system,sans-serif;cursor:pointer;letter-spacing:0.2px;";
  var ERROR_STYLE =
    "color:#b54848;font:13px/1.4 system-ui,-apple-system,sans-serif;margin-top:6px;";
  var SUCCESS_STYLE =
    "padding:14px;border:1px solid #d6cfc6;border-radius:8px;background:#f9f6f2;color:#1a1714;font:14px/1.5 system-ui,-apple-system,sans-serif;";
  var HONEYPOT_STYLE =
    "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "style") node.setAttribute("style", attrs[k]);
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  function renderForm(target, config) {
    target.innerHTML = "";

    if (config.headline) {
      target.appendChild(
        el(
          "p",
          {
            style:
              "font:600 16px/1.3 system-ui,-apple-system,sans-serif;color:#1a1714;margin:0 0 12px;",
          },
          [config.headline]
        )
      );
    }

    var form = el("form", { novalidate: "novalidate" });
    var fields = Array.isArray(config.fields) ? config.fields : [];

    fields.forEach(function (field) {
      var input = el("input", {
        name: field.name,
        type: field.type || "text",
        placeholder: field.label || field.name,
        required: field.required ? "required" : "",
        style: FIELD_STYLE,
        autocomplete: field.name === "email" ? "email" : "on",
      });
      form.appendChild(input);
    });

    // Honeypot — invisible to humans, bots fill it.
    var hp = el("input", {
      name: "_hp",
      type: "text",
      tabindex: "-1",
      autocomplete: "off",
      style: HONEYPOT_STYLE,
      "aria-hidden": "true",
    });
    form.appendChild(hp);

    var submitBtn = el(
      "button",
      { type: "submit", style: BUTTON_STYLE },
      [config.submit_label || "Subscribe"]
    );
    form.appendChild(submitBtn);

    var errorBox = el("div", { style: ERROR_STYLE });
    form.appendChild(errorBox);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      errorBox.textContent = "";
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      var data = new FormData(form);
      var payload = {};
      data.forEach(function (v, k) {
        payload[k] = v;
      });

      fetch(BASE + "/api/forms/" + config.id + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (body) {
            return { status: res.status, body: body };
          });
        })
        .then(function (r) {
          submitBtn.disabled = false;
          submitBtn.textContent = config.submit_label || "Subscribe";
          if (r.status >= 200 && r.status < 300 && r.body && r.body.ok) {
            if (r.body.redirect) {
              window.location.href = r.body.redirect;
              return;
            }
            target.innerHTML = "";
            target.appendChild(
              el("div", { style: SUCCESS_STYLE }, [
                r.body.message || "Thanks for subscribing!",
              ])
            );
            return;
          }
          errorBox.textContent =
            (r.body && r.body.error) || "Something went wrong. Please try again.";
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = config.submit_label || "Subscribe";
          errorBox.textContent = "Network error. Please try again.";
        });
    });

    target.appendChild(form);
  }

  function loadForm(target, formId) {
    fetch(BASE + "/api/forms/" + formId + "/config")
      .then(function (res) {
        if (!res.ok) throw new Error("config fetch failed");
        return res.json();
      })
      .then(function (config) {
        renderForm(target, config);
      })
      .catch(function () {
        target.innerHTML = "";
        target.appendChild(
          el(
            "p",
            {
              style:
                "color:#8a8176;font:13px/1.4 system-ui,-apple-system,sans-serif;",
            },
            ["This form is currently unavailable."]
          )
        );
      });
  }

  function init() {
    var nodes = document.querySelectorAll("[data-conduikt-form]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var formId = node.getAttribute("data-conduikt-form");
      if (!formId || node.getAttribute("data-conduikt-loaded") === "1") continue;
      node.setAttribute("data-conduikt-loaded", "1");
      loadForm(node, formId);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Use the request's protocol + host so the script's API calls hit the
  // same deployment that served it. Strips any path/query.
  const baseUrl = `${url.protocol}//${url.host}`;
  const js = buildEmbedJs(baseUrl);
  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      // Allow loading from anywhere — that's the point of an embed.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
