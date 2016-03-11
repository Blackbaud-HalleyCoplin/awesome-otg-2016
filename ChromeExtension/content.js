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
            chrome.runtime.sendMessage(
                {
                    get: {
                        url: url, 
                        params: params,
                        headers: headers
                    }
                },
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
        var foundMatch = false;
        
        for (var i = 0;i<possibleConstituents.length;i++) {
            if ($.inArray(possibleConstituents[i].emailAddress, loadedConstituents) === -1 && usersEmail !== possibleConstituents[i].emailAddress) {
                loadedConstituents.push(possibleConstituents[i].emailAddress);
                
                var searchParameters = $.param({
                    searchText: possibleConstituents[i].name
                });
                
                getApi("https://api.sky.blackbaud.com/constituent/constituents/search?" + searchParameters).then(function (data) {
                    if (data.results.length > 0) {
                        var id = data.results[0].id;
                        
                        Promise.all(
                            [getApi("https://api.sky.blackbaud.com/constituent/constituents/" + id),
                            getApi("https://api.sky.blackbaud.com/constituent/constituents/" + id + "/constituentcodes")]
                        ).then(function (responses) {
                            var matchedConstituent = {};
                            
                            matchedConstituent.name = responses[0].name;
                            matchedConstituent.constituentRecordUrl = "https://renxt.blackbaud.com/constituents/" + id;
                            matchedConstituent.phoneNumber = responses[0].phone.number;
                            matchedConstituent.website = responses[0].online_presence.address;
                            
                            if (responses[0].spouse) {
                                matchedConstituent.spouseName = responses[0].spouse.first + " " + responses[0].spouse.last;                        
                                matchedConstituent.spouseRecordUrl = "https://renxt.blackbaud.com/constituents/" + responses[0].spouse.id;
                            }
                            
                            var constituentCodeDescriptions = [];
                            $.each(responses[1].constituent_codes, function(index, constitCode) {
                                constituentCodeDescriptions.push(constitCode.description);
                            });
                            matchedConstituent.constituentCodes = constituentCodeDescriptions.join(", ");
                            
                            showSidebar(threadView, matchedConstituent);
                        });
                    }
                });     
            }
        }
    });
});
