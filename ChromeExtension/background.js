var secret = '',
    client_id = '',
    api_key = '',
    oauth_base_url = 'https://oauth2.sky.blackbaud.com/',
    oauth_token_url = oauth_base_url + 'token',
    oauth_authorize_url = oauth_base_url + 'authorization',
    auth_header = 'Basic ' + btoa(client_id + ':' + secret),
    access_token_key = "blackbaud.nxt.gmail.access_token",
    refresh_token_key = "blackbaud.nxt.gmail.refresh_token",
    expires_key = "blackbaud.nxt.gmail.expires",
    tenant_id_key = "blackbaud.nxt.gmail.tenant_id",
    tenant_name_key = "blackbaud.nxt.gmail.tenant_name",
    loginPromise,
    refreshPromise,
    myStorage = {};

chrome.runtime.onInstalled.addListener(function() {
    // clear any failed promises.
    delete loginPromise;
    delete refreshPromise; 
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.get) {
            get(request.get.url, request.get.params, request.get.headers).then(function(data) {
                sendResponse(data);
            });
            return true;
        }
    }
);

function getStorage(key) {
    //return Promise.resolve(myStorage.key);
    
    return new Promise(function(resolve) {
        chrome.storage.local.get(key, function(items) {
            if(Array.isArray(key)) {
                resolve(items);
            } else {
                var item;
                if(items[key]) {
                    item = items[key];
                }
                resolve(item);
            }
        });
    });
    
}

function setStorage(key, value) {
    //myStorage[key] = value;
    //return Promise.resolve();
    
    var item = {};
    item[key] = value;
    return new Promise(function(resolve) {
        chrome.storage.local.set(item, function() {
            resolve();
        });
    });
    
}

function storeTokens(data) {
    var p = [];
    p.push(setStorage(expires_key,  Date.now() + (data.expires_in * 1000)));
    p.push(setStorage(access_token_key, data.access_token));
    p.push(setStorage(refresh_token_key, data.refresh_token));
    return Promise.all(p);
}

function loginOAuth() {
    loginPromise = loginPromise || new Promise(function(resolve) {
        var redirectUrl = chrome.identity.getRedirectURL('oauth2');
        var auth_url = oauth_authorize_url + '?' +
            "client_id="+ client_id +
            "&response_type=code"+
            "&redirect_uri="+redirectUrl+
            "&state=abcdefg"
        var authorization_code;
        
        chrome.identity.launchWebAuthFlow({"url" : auth_url,"interactive": true}, function (responseUrl) {
            var search = responseUrl.replace(redirectUrl+'?', '');
            var obj = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
            authorization_code = obj.code;
            
            Promise.resolve($.ajax({
                url: oauth_token_url,
                type: 'POST',
                headers: {
                    Authorization: auth_header
                },
                data: {
                    grant_type: 'authorization_code',
                    code: authorization_code,
                    redirect_uri: redirectUrl
                }
            })).then(function(data) {
                var p = [];
                p.push(storeTokens(data));
                p.push(setStorage(tenant_id_key, data.tenant_id));
                p.push(setStorage(tenant_name_key, data.tenant_name));
                Promise.all(p).then(function() {
                    loginPromise = null;
                    resolve();
                });
            });
        });
    });
    
    loginPromise.catch(function() {
        loginPromise = null;
    });
    
    return loginPromise;
}

function refresh() {
    refreshPromise = refreshPromise || new Promise(function(resolve) {
        getStorage([expires_key, refresh_token_key]).then(function(values) {
            var dtNow = new Date(),
                dtExpires = new Date(values.expires_on),
                refreshToken = values.refresh_token;
            
            if (dtNow >= dtExpires) {
                // refresh token
                console.log('token expired');
                Promise.resolve($.ajax({
                    url: oauth_token_url,
                    type: 'POST',
                    headers: {
                        Authorization: auth_header
                    },
                    data: {
                        grant_type: 'refresh_token',
                        refresh_token: refresh_token
                    }
                })).then(function (data) {
                    storeTokens(data).then(function() {
                        refreshPromise = null;
                        resolve();
                    });
                });
            }
            else {
                refreshPromise = null;
                resolve();
            }
        });
    });

    refreshPromise.catch(function() {
        refreshPromise = null;
    });

    return refreshPromise;
}

function validateKeys() {
    return getStorage(access_token_key).
    then(function(token) {
        if(!token) {
            return loginOAuth();
        } else {
            return refresh();
        }    
    });
}

function get(url, params, headers) {
    return validateKeys().then(function() {
        return getStorage(access_token_key)
    }).then(function(token) {
        return Promise.resolve($.ajax({
            url: url,
            type: "GET",
            data: params,
            headers: $.extend({
                Authorization: 'Bearer ' + token,
                'bb-api-subscription-key': api_key
            }, headers)
        }));
    });
}
