# Third-Party Services - electionbettingodds.com

**Last Updated:** 2026-02-05

---

## Overview

| Category | Services | Request Count |
|----------|----------|---------------|
| Analytics | Google Analytics, GTM, StatCounter | 62 |
| Social/Tracking | Facebook Pixel, Twitter | 99 |
| Visualization | Google Charts | 92 |
| Archival | Internet Archive | 2 |
| **Total** | **7 services** | **273 requests** |

---

## 1. Google Analytics

**Purpose:** Website traffic analytics

### Configuration
| Property | Value |
|----------|-------|
| Measurement ID (GA4) | `G-PSSMNJWYG3` |
| Legacy UA ID | Via `analytics.js` |
| Implementation | gtag.js + analytics.js (dual) |

### Endpoints Called

| Method | Host | Path | Purpose |
|--------|------|------|---------|
| GET | www.googletagmanager.com | `/gtag/js?id=G-PSSMNJWYG3` | Load gtag library |
| POST | www.google-analytics.com | `/g/collect` | GA4 events |
| POST | www.google-analytics.com | `/j/collect` | Universal Analytics |
| GET | www.google.com | `/jsapi` | Google APIs loader |

### Data Collected
- Page views
- User engagement time
- Page URLs
- Referrer information
- Browser/device info

### Script Tag
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PSSMNJWYG3"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-PSSMNJWYG3');
</script>
```

---

## 2. Google Tag Manager

**Purpose:** Tag management platform

### Configuration
| Property | Value |
|----------|-------|
| Container ID | Part of gtag implementation |
| Host | www.googletagmanager.com |

Integrated with Google Analytics (same script).

---

## 3. Facebook Pixel / SDK

**Purpose:** Social sharing, potential ad tracking

### Configuration
| Property | Value |
|----------|-------|
| SDK Version | v2.5 |
| Features | Share button, XFBML |

### Endpoints Called

| Method | Host | Path | Purpose |
|--------|------|------|---------|
| GET | connect.facebook.net | `/en_US/sdk.js` | Load SDK |
| GET | www.facebook.com | `/v2.5/plugins/share_button.php` | Share widget |
| GET | static.xx.fbcdn.net | `/rsrc.php/*` | Static resources |

### Script Tag
```html
<script>
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.5";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
</script>
```

### Embedded Widget
```html
<iframe src="https://www.facebook.com/v2.5/plugins/share_button.php?...">
```

---

## 4. Twitter Analytics / Widgets

**Purpose:** Tweet button, social sharing

### Endpoints Called

| Method | Host | Path | Purpose |
|--------|------|------|---------|
| GET | platform.twitter.com | `/widgets.js` | Load widget library |
| GET | platform.twitter.com | `/js/button.*.js` | Button script |
| GET | syndication.twitter.com | `/settings` | Widget settings |
| - | platform.twitter.com | `/widgets/tweet_button.*.html` | Tweet button iframe |

### Script Tag
```html
<script>
!function(d,s,id){
  var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';
  if(!d.getElementById(id)){
    js=d.createElement(s);js.id=id;
    js.src=p+'://platform.twitter.com/widgets.js';
    fjs.parentNode.insertBefore(js,fjs);
  }
}(document, 'script', 'twitter-wjs');
</script>
```

### Embedded Widget
```html
<iframe src="https://platform.twitter.com/widgets/tweet_button.*.html?...
  text=ElectionBettingOdds.com%20has%20real-time%20odds...
  url=https://www.ElectionBettingOdds.com
  via=maximlott">
```

---

## 5. StatCounter

**Purpose:** Alternative web analytics

### Configuration
| Property | Value |
|----------|-------|
| Project ID | `10669543` |
| Security Code | `b9af9e3a` |
| Invisible | Yes (`sc_invisible=1`) |

### Endpoints Called

| Method | Host | Path | Purpose |
|--------|------|------|---------|
| GET | secure.statcounter.com | `/counter/counter.js` | Load counter |
| POST | c.statcounter.com | `/t.php` | Track pageview |

### Script Tag
```html
<script>
var sc_project=10669543;
var sc_invisible=1;
var sc_security="b9af9e3a";
var scJsHost = (("https:" == document.location.protocol) ?
"https://secure." : "http://www.");
document.write("<sc"+"ript type='text/javascript' src='" +
scJsHost+
"statcounter.com/counter/counter.js'></"+"script>");
</script>
```

---

## 6. Google Charts

**Purpose:** Interactive data visualization

### Configuration
| Property | Value |
|----------|-------|
| Version | 51 (current) |
| Packages | line, corechart, controls |
| Dependencies | dygraphs, webfontloader |

### Endpoints Called

| Method | Host | Path | Purpose |
|--------|------|------|---------|
| GET | www.gstatic.com | `/charts/loader.js` | Load charts API |
| GET | www.gstatic.com | `/charts/51/js/jsapi_compiled_*.js` | Chart modules |
| GET | www.gstatic.com | `/charts/51/css/*.css` | Chart styles |
| GET | www.gstatic.com | `/charts/51/third_party/dygraphs/*` | Dygraphs library |

### Modules Loaded
- `jsapi_compiled_default_module.js`
- `jsapi_compiled_graphics_module.js`
- `jsapi_compiled_ui_module.js`
- `jsapi_compiled_fw_module.js`
- `jsapi_compiled_line_module.js`
- `jsapi_compiled_controls_module.js`
- `jsapi_compiled_corechart_module.js`

### Usage Pattern
```javascript
google.charts.load('current', {packages: ['line']});

function drawChart() {
  var data = new google.visualization.DataTable();
  data.addColumn('datetime', 'X');
  data.addColumn('number', 'Harris');
  // ... more columns

  data.addRows([
    [new Date(2021,0,20), 19.8, ...],
    // ... data points
  ]);

  var chart = new google.charts.Line(document.getElementById('chart_div'));
  chart.draw(data, options);
}
```

---

## 7. Internet Archive (Wayback Machine)

**Purpose:** Historical page preservation (external reference)

### Observed Requests

| Method | Host | Path |
|--------|------|------|
| GET | web.archive.org | `/web/20220622153731im_/https://electionbettingodds.com/track*` |

**Note:** These appear to be references to archived versions, possibly for tracking image comparison or backup purposes.

---

## Privacy & Data Collection Summary

| Service | Data Collected | Cookie-based | Fingerprinting |
|---------|----------------|--------------|----------------|
| Google Analytics | Page views, engagement, URLs | Yes | Possible |
| StatCounter | Page views, visitor info | Yes | Possible |
| Facebook | Social interactions, tracking | Yes | Yes |
| Twitter | Social interactions | Yes | Possible |
| Google Charts | None (visualization only) | No | No |

---

## Security Considerations

### External Script Loading
All third-party scripts are loaded from external CDNs. If compromised:
- Google (gstatic.com, google-analytics.com, googletagmanager.com)
- Facebook (connect.facebook.net, fbcdn.net)
- Twitter (platform.twitter.com)
- StatCounter (statcounter.com)

### Recommended Mitigations
1. Consider Subresource Integrity (SRI) hashes for critical scripts
2. Content Security Policy (CSP) headers to restrict script sources
3. Regular auditing of third-party service configurations

---

## Service Health Dependencies

| Service | Impact if Unavailable |
|---------|----------------------|
| Google Charts | Charts won't render (critical) |
| Google Analytics | No analytics (non-critical) |
| StatCounter | No analytics (non-critical) |
| Facebook SDK | Share button broken (minor) |
| Twitter Widgets | Tweet button broken (minor) |

---

## Hosts Whitelist

If implementing CSP or firewall rules, allow these hosts:

```
# First-party
electionbettingodds.com

# Google
www.googletagmanager.com
www.google-analytics.com
www.google.com
www.gstatic.com

# Facebook
connect.facebook.net
www.facebook.com
static.xx.fbcdn.net
staticxx.facebook.com

# Twitter
platform.twitter.com
syndication.twitter.com

# StatCounter
secure.statcounter.com
c.statcounter.com

# Archive (optional)
web.archive.org
```
