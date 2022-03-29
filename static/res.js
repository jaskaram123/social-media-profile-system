let alerts = document.getElementById('alert')
let alerts2 = document.getElementById('alert2')
alerts.style.display = 'none'

if(alerts.innerHTML == ''){
    alerts.style.display = 'none'
}else{
    alerts.style.display = 'block'
    setTimeout(() => {
        alerts.innerHTML = ''
        alerts.style.display = 'none';
    }, 3000);
}
if(alerts2.innerHTML == ''){
    alerts2.style.display = 'none'
}else{
    alerts2.style.display = 'block'
    setTimeout(() => {
        alerts2.innerHTML = ''
        alerts2.style.display = 'none';
    }, 3000);
}

function onSignIn(googleUser) {
    var id_token = googleUser.getAuthResponse().id_token;
    var xhr = new XMLHttpRequest();
xhr.open('POST', '/post');
xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
xhr.onload = function() {
    console.log(xhr.responseText)
    if(xhr.responseText == 'success'){
        console.log('redirected in xhr onload')
        signOut()
        window.location = 'http://localhost:8000/webchat'
    }else if(xhr.responseText == 'error'){
        signOut()
        alert('EMAIL REGISTERED VIA WEBSITE. USE ANOTHER LOGIN ID.')
    }
};
xhr.send('idtoken=' + id_token);
  }

  function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
    });
  }
  document.getElementById('buttonpic').disabled = true;

  document.getElementById('pic').onchange = function () {
      document.getElementById('information').innerText = 'THE BUTTON IS ACTIVATED. YOU CAN SUBMIT NOW.'
      document.getElementById('buttonpic').disabled = false;
  }