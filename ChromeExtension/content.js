InboxSDK.load('1.0', 'sdk_Sky-Integration_809ded04d4').then(function(sdk){
    var threadSidebars = new WeakMap();
    var threadLoadedConstituents = new WeakMap();
    
    function showSidebar(threadView, constituentData) {
        if (!threadSidebars.has(threadView)) {
            threadSidebars.set(threadView, document.createElement("div"));
            
            threadView.addSidebarContentPanel({
               el: threadSidebars.get(threadView),
               title: "Blackbaud",
               iconUrl: chrome.runtime.getURL('bbicon.png') 
            });
        }
        
        get(chrome.runtime.getURL('sidebar.html')).then(function (html) {
            threadSidebars.get(threadView).innerHTML = threadSidebars.get(threadView).innerHTML + Mustache.render(html, constituentData); 
        });
    }

    function getApi(url, params, headers) {
        return new Promise(function(resolve) {          
            chrome.runtime.sendMessage({get: {url: url, params: params, headers: headers}},
                function(response) {
                    resolve(response);
                }
            );
        })
    }
    
    function get(url, params, headers) {
        return Promise.resolve(
            $.ajax({
                url: url,
                type: "GET",
                data: params,
                headers: headers
            })
        );
    }
    
    function populateConstituentSidebar(constituent, threadView)
    {
        showSidebar(threadView, {
            name: constituent.name,
            constituentRecordUrl: constituent.constituentRecordUrl,
            phoneNumber: constituent.phoneNumber,
            website: constituent.website,
            spouseName: constituent.spouseName,
            spouseRecordUrl: constituent.spouseRecordUrl,
            constituentCodes: constituent.constituentCodes,
            lastAction: {
                type: "Meeting - Face to Face",
                date: "1/2/2015",
                summary: "Summary of action"
            },
            nextAction: {
                type: "Meeting - Face to Face",
                date: "6/2/2015",
                summary: "Summary of action"
            },
            lastNote: {
                type: "Biographical",
                date: "3/7/2016",
                summary: "Test Note"
            }
        });
    }

    sdk.Conversations.registerMessageViewHandler(function(messageView) {
        var possibleConstituents = messageView.getRecipients();
        possibleConstituents.push(messageView.getSender());
        
        var threadView = messageView.getThreadView();
        
        if (!threadLoadedConstituents.has(threadView)) {
            threadLoadedConstituents.set(threadView, []);
        }
        
        var loadedConstituents = threadLoadedConstituents.get(threadView);
        var usersEmail = sdk.User.getEmailAddress();
        var matchedConstituent = {};
        var foundMatch = false;
        
        for (var i = 0;i<possibleConstituents.length;i++) {
            if ($.inArray(possibleConstituents[i].emailAddress, loadedConstituents) === -1 && usersEmail !== possibleConstituents[i].emailAddress) {
                loadedConstituents.push(possibleConstituents[i].emailAddress);
                
                var searchParameters = $.param({
                    searchText: possibleConstituents[i].name
                });
                
                getApi("https://api.sky.blackbaud.com/constituent/constituents/search?searchText=" + searchParameters).then(function (data) {
                    $.each(data.results, function (index, searchResult) {
                        if (searchResult.email === possibleConstituents[i].emailAddress) {
                            console.log(searchResult.id);
                            matchedConstituent.id = searchResult.id;
                            foundMatch = true;
                        }
                    });
                });
                
                // FOR TESTING
                matchedConstituent.id = 280;
                foundMatch = true;
                matchedConstituent.name = possibleConstituents[i].name;
                
                if (foundMatch)
                {
                    // Get basic constituent information https://api.sky.blackbaud.com/constituent/constituents/{constituentId}
                    getApi("https://api.sky.blackbaud.com/constituent/constituents/" + matchedConstituent.id).then(function (data) {
                        var obj = JSON.parse(data.results);
                        // UNCOMMENT THIS WHEN ACTUAL RESPONSE RECEIVED
                        //matchedConstituent.name = obj.name;
                        matchedConstituent.constituentRecordUrl = "http://rexdev.blackbaud.com/constituents/" + matchedConstituent.id;
                        matchedConstituent.phoneNumber = obj.phone.number;
                        matchedConstituent.website = obj.online_presence.address;
                        matchedConstituent.spouseName = obj.spouse.first + " " + obj.spouse.last;
                        matchedConstituent.spouseRecordUrl = "http://rexdev.blackbaud.com/constituents/" + obj.spouse.id;
                        
                    })
                    
                    matchedConstituent.constituentCodes = [];
                    // Get Constituent Codes https://api.sky.blackbaud.com/constituent/constituents/{constituentId}/constituentcodes
                    getApi("https://api.sky.blackbaud.com/constituent/constituents/" + matchedConstituent.id + "/constituentcodes").then(function(data) {
                        $.each(data.results, function(index, constitCode) {
                            matchedConstituent.constituentCodes.push(constitCode.description);
                        })
                    })
                    
                    populateConstituentSidebar(matchedConstituent, threadView);
                }
                
                else
                {
                    showSidebar(threadView, {
                        name: possibleConstituents[i].name,
                        constituentRecordUrl: "http://rexdev.blackbaud.com/constituents/280",
                        phoneNumber: "843-234-1232",
                        website: "http://blackbaud.com",
                        spouseName: "Wendy Hernandez",
                        spouseRecordUrl: "http://rexdev.blackbaud.com/constituents/410",
                        constituentCodes: "Major Donor Prospect, Board Chair",
                        lastAction: {
                            type: "Meeting - Face to Face",
                            date: "1/2/2015",
                            summary: "Summary of action"
                        },
                        nextAction: {
                            type: "Meeting - Face to Face",
                            date: "6/2/2015",
                            summary: "Summary of action"
                        },
                        lastNote: {
                            type: "Biographical",
                            date: "3/7/2016",
                            summary: "Test Note"
                        }
                    });
                }
                
            }
        }
    });
});
