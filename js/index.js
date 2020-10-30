
var renderDocumentList = function(data, searchtxt) {
 
  // show total vault size
  vaultSize(function(err, size) {
    
    // display vault size
    $('#vaultsizebadge').html(size);
    
    if (!data || data.length == 0) {
  
      if (size == 0) {
        var html = emptyVaultTemplate({ domain: searchtxt});
      } else {
        var html = noMatchesTemplate({ domain: searchtxt});
      }          
  
    } else {

  
      // render as a table of passwords
      var html = '<table class="table">';
      html += matchRowHeader({});
      for(var i in data) {
        if (data[i].username.length > 12) {
          data[i].displayUsername = data[i].username.substring(0,15) + "...";
        } else {
          data[i].displayUsername = data[i].username;
        }
        html += matchRowTemplate(data[i]);
      }
      html += "</table>";


      // enable clipboard integration
      new Clipboard('.clippy');
  
      // enable delete button actions
  
    }

    // post the search results
    $('#status').html(html);

    // enable delete button actions
    // Or, hide them
    $(".deletebutton").bind("click", function(e) {
      vaultRemove($(this).attr('data-id'), $(this).attr('data-rev'), function(err, data) {
        showMainPage();
      })
    });
  

    


  });
}

// render the main page - documents filtered by current tab's domain name
var showMainPage = function() {

  // calculate the current tab in view
  getCurrentTabUrl(function(err, url) {
    if(err || !url) return;
  
    // extract the domain name from the url
    var domain = extractDomainName(url);

    loadSession(function(err, session) {
    
      // find all vault entries that match this domain name
      vaultFilter(domain, session.hash,  function(err, data) {
      
        renderDocumentList(data, domain);
                
      });
    
    });
  });

};

var showLoginPanel = function() {
  
  $('#loginmodal').modal({})
  $('#loginmodalbutton').attr("disabled", false);
  
  // clear the form
  $('#loginpassword').val("");
  
  $('#loginalert').html("Please provide the password that will be used to encrypt and decrypt your password vault.");
  $('#loginalert').removeClass("alert-danger");
  $('#loginalert').addClass("alert-info");
  
};



// when the page has loaded
$( document ).ready(function() {
  
  loadSession(function(err, session) {
    if (err || session == null) {
      showLoginPanel();
    } else {
      showMainPage();
    }
    
  });

  
  // when the add button is pressed
  $("#addbutton").bind("click", function() {
    
    // remove the main page and show the add form
    $('#addmodal').modal({})
    
    // pre-populate the form
    $('#url').val("");
    $('#username').val("");
    $('#password').val("");
    $('#notes').val("");
    getCurrentTabUrl(function(err, url) {
      $('#url').val(url);
    });
  });
  
  // when the close button of the search modal is clicked
  $("#addmodalbutton").bind("click", function() {
    $('#addform').submit();
  });
  
  // when the search button is pressed
  $("#searchbutton").bind("click", function() {
    $('#searchmodal').modal({})
  });
  
  // when the close button of the search modal is clicked
  $("#searchmodalbutton").bind("click", function() {
    $('#searchform').submit();
  });
  
  // when the cloud button is pressed
  $("#cloudbutton").bind("click", function() {
    
    // remove the main page and show the add form
    $('#cloudmodal').modal({})
    
    // clear the form
    $('#cloudurl').val("");
  });
  
  // when the close button of the search modal is clicked
  $("#cloudmodalbutton").bind("click", function() {
    $('#cloudform').submit();
  });
  
  // when the login button of the login modal is clicked
  $("#loginmodalbutton").bind("click", function() {
    $('#loginform').submit();
  });
  
  // when the logout button is pressed
  $("#logoutbutton").bind("click", function() {
    
    // kill the session
    clearSession(function(err, data) {
       showLoginPanel();
    });
  });
  
  // when the add form submit button is pressed
  $('#addform').bind("submit", function(event) {
    event.preventDefault();
    
    // create a document to add to the database
    var doc = {
      url: $('#url').val(),
      domain: "",
      username: $('#username').val(),
      password: $('#password').val(),
      notes: $('#notes').val()
    }
    doc.domain = extractDomainName(doc.url);
    
    // write it
    loadSession(function(err, session) {
      vaultWrite(doc, session.hash, function(err,data) {
      
        $('#addmodal').modal('hide');
        
        // re-render the main page
        showMainPage();
      });
    })

  });
  
  // when the cloud form submit button is pressed
  $('#cloudform').bind("submit", function(event) {
    event.preventDefault();
    $('#cloudbutton').attr("disabled", true);
    
    $('#cloudstatus').html(replicationStartedTemplate( ));
    
    var url = $('#cloudurl').val();
    vaultdb.sync(url)
     .on("change", function(info) { 
       console.log("CHANGE",info);
       $('#cloudstatus').html(replicationChangeTemplate( { info: info.change.last_seq} )); 
     })
     .on("complete", function(info){ 
       $('#cloudstatus').html(replicationCompleteTemplate( { info: JSON.stringify(info)} )); 
       $('#cloudbutton').attr("disabled", false);  
       setTimeout(function() {
         $('#cloudmodal').modal('hide')  
       },500);
        
     })
     .on("error", function(err) { 
       $('#cloudstatus').html(replicationErrorTemplate( { info: JSON.stringify(err)} )); 
       $('#cloudbutton').attr("disabled", false);    
     });
  });
  
  // when the login form submit button is pressed
  $('#loginform').bind("submit", function(event) {
    event.preventDefault();
    
    $('#loginmodalbutton').attr("disabled", true);
    
    var password = $('#loginpassword').val();
    
    vaultSize(function(err, vaultsize) {
      if(err) return;
      
      // if there are secrets already stored
      if (vaultsize > 0) {
        
        // read back the verification document to see if we can decrypt it correctly
        var hash = hashPassword(password);
        vaultRead("verify", hash, function(err, data) {
          if (!err && data && data.password && data.password == "volt") {
            saveSession({ hash: hash}, function(err, data) {
              $('#loginmodal').modal('hide');
              showMainPage();
            });
          } else {
            $('#loginalert').addClass("alert-danger");
            $('#loginalert').html("Incorrect password");
            $('#loginmodalbutton').attr("disabled", false);
          }
        })
      } else {
        // create an entry in the vault encrypted with this password
        var hash = hashPassword(password);
        vaultWrite({_id: "verify", domain:"test.com", url:"http://test.com", password:"volt"}, hash, function(err, data) {
          saveSession({ hash: hash}, function(err, data) {
            $('#loginmodal').modal('hide');
            showMainPage();
          });
        });
        
        
      }
      $('#loginbutton').attr("disabled", false);
      
    })
  });
  
  // when the search form submit button is pressed
  $('#searchform').bind("submit", function(event) {
    event.preventDefault();
    $('#searchmodal').modal('hide')
    var searchterm = $('#searchterm').val();
    loadSession(function(err, session) {
    
      vaultSearch(searchterm, session.hash,function(err, data) {
        console.log("SUBMIT!",err, data);
        renderDocumentList(data, searchterm);
      });
    });

  });
  
});


