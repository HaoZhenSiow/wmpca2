const publicVapidKey = 'BHQtpN6mNSnAQ_7DJ4oMX8wROxg0Swy2wqP36wH3xovKdj31Fmh6L1EVPHfEY_ii7KxvQXm0Tt5s97l2P0UPOaI'

window.addEventListener('load', function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('serviceWorker.js')
      .then(registration => {
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUnit8Array(publicVapidKey)
        })
        // .then(subscription => {
        //   console.log('Push subscription created: ', JSON.stringify(subscription))
        // })
      })

    navigator.serviceWorker.addEventListener('message', event => {
      alert(event.data)
    })
  }
})

// document.getElementById('unsubscribe').addEventListener('click', unsubscribePush)

// function unsubscribePush() {
//   navigator.serviceWorker.ready.then(registration => {
//     registration.pushManager.getSubscription().then(subscription => {
//       if (subscription) {
//         subscription.unsubscribe()
//       } else {
//         console.log('no subscription')
//       }
//     })
//   })
// }

function urlBase64ToUnit8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}