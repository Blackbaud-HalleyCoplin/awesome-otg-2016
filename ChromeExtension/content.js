InboxSDK.load('1', 'Hello World!').then(function(sdk){
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
    
    sdk.Conversations.registerMessageViewHandler(function(messageView) {
        var possibleConstituents = messageView.getRecipients();
        possibleConstituents.push(messageView.getSender());
        
        var threadView = messageView.getThreadView();
        
        if (!threadLoadedConstituents.has(threadView)) {
            threadLoadedConstituents.set(threadView, []);
        }
        
        var loadedConstituents = threadLoadedConstituents.get(threadView);
        var usersEmail = sdk.User.getEmailAddress();
        
        for (var i = 0;i<possibleConstituents.length;i++) {
            if ($.inArray(possibleConstituents[i].emailAddress, loadedConstituents) === -1 && usersEmail !== possibleConstituents[i].emailAddress) {
                loadedConstituents.push(possibleConstituents[i].emailAddress);
                
                var searchParameters = $.param({
                    searchText: possibleConstituents[i].name
                });
                
                get("https://api.sky.blackbaud.com/constituent/constituents/search?searchText=" + searchParameters).then(function (data) {
                    $.each(data.results, function (index, searchResult) {
                        if (searchResult.email === possibleConstituents[i].emailAddress) {
                            console.log(searchResult.id);
                        }
                    });
                });
                
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
    });
});
