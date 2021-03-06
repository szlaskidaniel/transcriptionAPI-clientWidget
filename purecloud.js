// **** Token Implicit Grant (Browser) - UserLogin ****
let redirectUri = 'https://szlaskidaniel.github.io/transcriptionAPI-clientWidget/index.html';
//let redirectUri = 'https://localhost/index.html';
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

const apiInstance = new platformClient.ConversationsApi();
const notificationsApi = new platformClient.NotificationsApi();
let webSocket, conversationsTopic, notificationChannel;
let waitingLabel = true;


let myParams = {
    conversationId: getUrlVars()['conversationId'],
    env: getUrlVars()['pcEnvironment'],   
    oauth: getUrlVars()['oauth']
};

console.log(myParams);

if (!myParams.env || !myParams.oauth || !myParams.conversationId) {
    myParams.conversationId = localStorage.getItem('custom_conversationId');
    myParams.oauth = localStorage.getItem('custom_oauth');
    myParams.env = localStorage.getItem('custom_env');
} else if (myParams.conversationId && myParams.env && myParams.oauth){
    localStorage.setItem('custom_conversationId', myParams.conversationId);
    localStorage.setItem('custom_oauth', myParams.oauth);
    localStorage.setItem('custom_env', myParams.env);
}

if (myParams.env)
    client.setEnvironment(myParams.env);

client.setPersistSettings(true);

client.loginImplicitGrant(myParams.oauth, redirectUri, { state: myParams })
.then((data) => {
    // Make request to GET /api/v2/users/me?expand=presence
    console.log('Logged-In');

    myParams.conversationId = localStorage.getItem('custom_conversationId');
    myParams.oauth = localStorage.getItem('custom_oauth');
    myParams.env = localStorage.getItem('custom_env');

   
    console.log(myParams);
    
    if (!myParams.conversationId) return;
    notificationsApi.postNotificationsChannels().then((channel) => {
        console.log('channel: ', channel);
		notificationChannel = channel;

        // Set up web socket
        webSocket = new WebSocket(notificationChannel.connectUri);
        webSocket.onmessage = handleNotification;

        // Subscribe to authenticated user's conversations
        conversationsTopic = `v2.conversations.${myParams.conversationId}.transcription`;
        const body = [ { id: conversationsTopic } ];
        notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body).then((data) => {
            console.log('Subscribed !', data);     
            // $('#myTable').append(`<tr><td><small class="text-success"><i class="bi-box"></i></small></td><td style="padding-left: 20px"><small class="text-muted">waiting for transcription...</small></td></tr>`);                                                       
            $('#myTable').append(`<tr><td><small class="text-success"><img src="loader.gif" alt="This is an animated gif image" width=15/></small></td><td style="padding-left: 20px"><small class="text-muted">waiting for transcription...</small></td></tr>`);                                                                   
            
        }).catch((err) => {  console.log(err)   });

        
    }).catch((error) => {
        console.log(error);
    });
     
})
.catch((err) => {
// Handle failure response
    console.log(err);    
});


// Handle incoming Genesys Cloud notification from WebSocket
function handleNotification(message) {
    console.log('handleNotification...');
	// Parse notification string to a JSON object
	const notification = JSON.parse(message.data);

	// Discard unwanted notifications
	if (notification.topicName.toLowerCase() === 'channel.metadata') {
		// Heartbeat
		console.info('Ignoring metadata: ', notification);
		return;
	} else if (notification.topicName.toLowerCase() !== conversationsTopic.toLowerCase()) {
		// Unexpected topic
		console.warn('Unknown notification: ', notification);
		return;
	} else {
		console.log('Conversation notification: ', notification);
	}

	let transcripts = notification.eventBody.transcripts;
    if (transcripts.length > 0) {
        if (waitingLabel) {
            document.getElementById("myTable").deleteRow(0);
            waitingLabel = false;
        };
        deleteLastrow('myTable');
        transcripts.forEach(element => {
            let icon = element.channel.toLowerCase() === 'internal' ? '<i class="bi bi-headset"></i>' : '<i class="bi bi-telephone-outbound-fill"></i>';
            $('#myTable').append(`<tr><td><small class="text-muted">${icon}</small></td><td style="padding-left: 20px">${element.alternatives[0].transcript}</td></tr>`);            
        });
        $('#myTable').append(`<tr><td style="padding-top: 20px"><small class="text-success"><img src="loader2.gif" alt="This is an animated gif image" width=15/></small></td><td></td></tr>`);                                                                   

    }
	
}


function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function deleteLastrow(tableID) {
    var table = document.getElementById(tableID);
    var rowCount = table.rows.length;

    table.deleteRow(rowCount -1);
}