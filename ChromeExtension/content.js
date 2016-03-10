InboxSDK.load('1', 'Hello World!').then(function(sdk){
    var threadSidebars = new WeakMap();
    
    function showSidebar(threadView, constituentData) {
        if (!threadSidebars.has(threadView)) {
            threadSidebars.set(threadView, document.createElement("div"));
            
            threadView.addSidebarContentPanel({
               el: threadSidebars.get(threadView),
               title: "Constituent Data",
               iconUrl: chrome.runtime.getURL('stripe.png') 
            });
        }
        
        get(chrome.runtime.getURL('sidebar.html')).then(function (html) {
            threadSidebars.get(threadView).innerHTML = threadSidebars.get(threadView).innerHTML + Mustache.render(html, constituentData); 
        });
    }

    function get(url) {
        return Promise.resolve(
            $.ajax({
                url: url,
                type: "GET"
            })
        );
    }
    
    sdk.Conversations.registerMessageViewHandler(function(messageView) {
        var possibleConstituents = messageView.getRecipients();
        possibleConstituents.push(messageView.getSender());
        
        var threadView = messageView.getThreadView();
        
        showSidebar(threadView, {
            name: possibleConstituents[0].name
        });
    });
});
