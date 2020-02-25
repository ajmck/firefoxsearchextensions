// Search plugin for DeviceSearchTool for COMPANYNAME
// Alex McKirdy
// ajmck@users.noreply.github.com

// Cases where it has been tested (read: failed during development causing a heck of a load of workarounds):
// New tab
// DeviceSearchTool search page
// DeviceSearchTool device page
// Tab with different webpage loaded



const DASHBOARDURL = "https://DOMAINNAMEREMOVED/portal/dashboardOperationalView.faces";
const SEARCHURL = "https://DOMAINNAMEREMOVED/portal/search.faces";



browser.omnibox.setDefaultSuggestion({
  description: 'Device Search (blank for dashboard)'
});



function DeviceSearchToolQuery(querystring) {
  // Since DeviceSearchTool is written in a old JavaX page, there's a 'viewstate' field for validation.
  // Meaning, a query isn't just a simple GET request, but instead a POST containing specific strings...

  // debug to make sure script is executing
  // document.body.style.backgroundColor = "#000000";

  querystring = querystring.trim();

  // replace the values to be queried
  var searchform = document.getElementById('Query');
  searchform.setAttribute("value", 'Query');
  document.getElementById('Query:searchMode').setAttribute("value", "false");
  // doc.getElementById('Query:j_idt47').setAttribute("value", 'Search');
  document.getElementById('Query:basicTypes').setAttribute("value", 'Device');
  document.getElementById('Query:basicFields').setAttribute("value", 'Name');
  document.getElementById('Query:basicComparators').setAttribute("value", 'CONTAINS');
  document.getElementById("Query:ComparisonValue").setAttribute("value", querystring)

  // following button has been missing when page is loaded, but still required for it to post successfully
  var submitButton = document.createElement("input");
  submitButton.setAttribute("name", "Query:j_idt47");
  submitButton.setAttribute("value", "Search");
  submitButton.setAttribute("class", "button");
  searchform.appendChild(submitButton)

  searchform.submit();

  // TODO - wait until submission is fully returned

  // which, as far as I can tell, has to be done each time search.faces is loaded
  // reward vs effort might not quite stack up 

//   setTimeout(() => {
//   var results = document.getElementById("Query:deviceResultTable");

//   // count results, but exclude header from count
//   // https://stackoverflow.com/a/3053530
//   var resultcount = results.tBodies[0].rows.length;
//   console.log(resultcount);

//   // TODO - open result if only one returned
//   if (resultcount === 1) {
//     var resultdevice = document.getElementsByClassName("dataTableRow1");
//     console.log(resultdevice)
//   }

// }, 1000);

}



function WaitForTabLoad(tab) {
  // firefox bug - browser.tabs.executeScript doesn't wait until the page is loaded
  // workaround ripped from here
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1397667#c4

  // Will fail if current page is about:blank; the link above shows a longer possible workaround 

  if (tab.status == "loading") {
    return new Promise((resolve, reject) => {
      var timer = setTimeout(() => {
        browser.tabs.onCreated.removeListener(onUpdated);
        reject(new Error("Tab did not complete"));
      }, 5000);
      function onUpdated(tabId, changeInfo, _tab) {
        if (tabId == tab.id && _tab.status == "complete") {
          clearTimeout(timer);
          browser.tabs.onUpdated.removeListener(onUpdated);
          resolve(_tab);
        }
      }
      browser.tabs.onUpdated.addListener(onUpdated);
    });
  } else {
    return tab;
  }
}



function HandlePromiseError(err) {
  console.log(err);
}



function ExecuteDeviceSearchToolScriptInTab(tab, querystring) {
  // wrap in timeout since it can otherwise fail when navigating from another page
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1254003
  // https://stackoverflow.com/a/50230548
  setTimeout(() => {

    // Tab loaded, it's now safe to call tabs.executeScript
    browser.tabs.executeScript(tab.id, {
      // possibly want some better vaildation on querystring before passing it through
      code: `DeviceSearchToolQuery("${querystring}");`
    });

  }, 1000);
}



browser.omnibox.onInputEntered.addListener((querystring, disposition) => {
  // no graceful way to handle multiple tabs with DeviceSearchTool, so only implement the disposition for loading the current tab

  // Go to dashboard if no device provided
  if (querystring.length === 0) {
    browser.tabs.update({ url: DASHBOARDURL });
    return;
  }

  // If we're already on a DeviceSearchTool page, force refresh before working (incase we're on an event summary page)
  // get current tab first
  browser.tabs.getCurrent().then(curtab => {
    // apparently curtab in the below line is undefined - but since it wasn't working without my hands are tied
    if (curtab.url == SEARCHURL) {
        browser.tabs.reload(curtab.id).then(
            ExecuteDeviceSearchToolScriptInTab(curtab, querystring), HandlePromiseError
        );
    }
  }, HandlePromiseError);

  // update will GET page if the current tab isn't the desired URL
  browser.tabs.update({ url: SEARCHURL })
  .then(WaitForTabLoad, HandlePromiseError)
  .then(result => ExecuteDeviceSearchToolScriptInTab(result, querystring), HandlePromiseError);

});
