// Search plugin for BMC Remedy
// Alex McKirdy
// ajmck@users.noreply.github.com


// Binds to the Firefox searchbar, and takes an ITSM reference in the form INC000001234567 or 1234567
// If only the keyword and no reference is entered, then it will begin creating a new ticket

// Changelog
// Version 0.0.1 - Initial version, search and create incidents
// Version 0.0.2 - Add Vendor Reference search
// Version 0.0.3 - Trim trailing whitespace on input
// TODO: Better Error Handling
// TODO: Search by work order
// TODO: Search alternative software used in COMPANY
// BUG: Logo isn't set in address bar - fault with Firefox https://stackoverflow.com/questions/48066906


// base URL
const HOMEPAGE = "https://DOMAINNAMEREMOVED/arsys";
const ITSMURL = "https://DOMAINNAMEREMOVED/arsys/servlet/ViewFormServlet?&form=HPD:Help+Desk&server=itsmarprod";
const SUBMITURL = `${ITSMURL}&mode=Submit`;


browser.omnibox.setDefaultSuggestion({
    // text displayed as soon as hitting the keyword 'e'
    // Without this, the name of the extension (set in manifest.json) is used 
    description: 'ITSM Search (blank for new incident)'
});


function GetItsmIncidentUrl(text) {
    // returns the appropriate URL for the reference provided
    let url = "";
    if (text.startsWith("INC")) {
        // full INC reference provided
        // must be upper case for search to work
        url = `${ITSMURL}&qual='1000000161'=%22${text}%22`;
    } else if (text.match(/[0-9]/)) {
        // assume 7 digit INC provided
        // TODO - error checking with regex rule /[0-9]/
        url = `${ITSMURL}&qual='1000000161'=%22INC00000${text}%22`;
    }
    // else {
    // vendor ref - note different qual value
    //    url += `${ITSMBASE}&qual='1000000652'=%22${text}%22`
    //}
    return url;
}

function createSuggestions(input) {
    // creates the suggestions shown after typing has started
    // some overlap with GetItsmIncidentUrl above, should condense later
    var result = []

    if (input.startsWith("I")) { // assumes the user will enter something starting INC00000
        result.push({
            content: GetItsmIncidentUrl(input),
            description: "Search eRemedy " + input
        });

    
    } else if (input.match(/[0-9]/)) { 
        result.push({
            content: GetItsmIncidentUrl(input),
            description: "Search eRemedy INC00000" + input
        });
    }

    // no conditional, show this always
    result.push({
        content: SUBMITURL,
        description: "Click to create new ITSM incident"
    });

    // show this only if there's some input
    if (input.length > 0){
        result.push({
            // %22 is the " character (quotes string to be searched)
            // %25 is the % character (perform search with LIKE operator (it didn't work when entered in the address bar))
            content:  `${ITSMURL}&qual='1000000652'=%22%25${input}%25%22`,
            description: "Click to search vendor ref " + input 
        })
    }

    return result;
}



browser.omnibox.onInputChanged.addListener((input, suggest) => {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/omnibox/onInputChanged
    // show suggestions upon typing in the address bar
    suggest(createSuggestions(input));
  });



browser.omnibox.onInputEntered.addListener((text, disposition) => {
    // perform the search when enter is pressed or a suggestion is clicked
    let url = "";

    // remove following whitespace
    text = text.trim();

    if (text.length === 0) {
        // Create a new ticket if no reference provided
        url = SUBMITURL;
    } else if (!text.startsWith("http")) {
        // if the suggestion was clicked then text will be a URL
        // meaning, only GetItsmIncidentURL will be triggered by default
        url = GetItsmIncidentUrl(text);
    } else {
        //  suggestion clicked
        url = text;
    }
    
    // GetITSMIncidentURL will return "" if it doesn't begin with INC or contains non-digits
    // therefore, if url is empty, an invalid INC was passed, so don't do anything with the tab
    if (url === "") return;


    // Handle keyboard modifiers to open in new tab etc
    // https://github.com/mdn/webextensions-examples/blob/master/firefox-code-search/background.js

    switch (disposition) {
        case "currentTab": // enter, replaces currently open tab
          browser.tabs.update({url});
          break;
        case "newForegroundTab": // alt-enter, open in new tab
          browser.tabs.create({url});
          break;
        case "newBackgroundTab": // alt-shift-enter, open in new background tab
          browser.tabs.create({url, active: false});
          break;
      }
});