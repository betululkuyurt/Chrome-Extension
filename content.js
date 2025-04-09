document.getElementById('showRestaurants').addEventListener('click', function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: function() {
              let restaurantElements = document.querySelectorAll('.vendor-name');
              let ratingElements = document.querySelectorAll('.bds-c-rating__label-primary');
              let ratingCount = document.querySelectorAll('.bds-c-rating__label-secondary');
              let restaurants = [];
              for (let i = 0; i < restaurantElements.length; i++) {
                  let name = restaurantElements[i].innerText;
                  let rating = ratingElements[i]?.innerText || "0"; // Puan yoksa 0
                  let count = ratingCount[i]?.innerText.replace("(", "").replace(")", "")|| "0";
                  restaurants.push({
                      name: name,
                      rating: parseFloat(rating) || 0, // NaN olursa 0 atanır
                      count: count || 0
                  });
              }
              return restaurants; // Restoran listesi geri döndürülür
          }
      }, (results) => {
          console.log('Restoran verileri alındı'); 
          if (results && results[0] && results[0].result) {
              let restaurants = results[0].result;

              // Restoran verilerini Gemini API'ye gönder
              callGeminiAPI(restaurants);
          } else {
              console.error('Restoran bilgileri alınamadı.');
          }
      });
  });
});

function callGeminiAPI(restaurants) {
  const api_key = "AIzaSyAw3Q1wXEXwQbmgXDtSReTeN5GNw8Oqo20";   
  // Show loading indicator
  let responseDiv = document.getElementById('geminiResponse');
  if (!responseDiv) {
      responseDiv = document.createElement('div');
      responseDiv.id = 'geminiResponse';
      document.body.appendChild(responseDiv); // Add the response div to the popup
  }
  
  responseDiv.innerHTML = '<p>Yükleniyor...</p>'; // Loading message

  const prompt = `
You are tasked with analyzing restaurant data from Yemeksepeti. Below is a list of restaurants, each with its rating and the number of ratings they've received:

${restaurants.map(rest => `${rest.name}: Rating - ${rest.rating}, Rating Count - ${rest.count}`).join(', ')}.

Your goal is to identify and list **10 top restaurants** based on the following criteria:
1. **Priority on Ratings**: Choose restaurants with the highest ratings.
2. **Rating Count Threshold**: The number of ratings for a restaurant should not be significantly lower than others.
 Specifically, a restaurant should not be included if its rating count is less than 1/100th of the restaurant with the highest rating count.
3. **Balance Ratings and Counts**: While high ratings are prioritized, you should also factor in the number of ratings to ensure balance. 

For each of the 10 restaurants, briefly describe what users generally appreciate about the restaurant (positive feedback) and what common 
criticisms they have (negative feedback). Provide your response in plain text format for use in a Chrome extension.`; 


  

  fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + api_key, {
      method: 'POST', 
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          "contents": [
              {
                  "parts": [
                      {
                          "text": prompt
                      }
                  ]
              }
          ]
      })
  })
  .then(response => response.json())
  .then(data => {
      console.log('API yanıtı:', data); // Log the API response

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          const suggestions = data.candidates[0].content.parts.map(part => part.text).join(''); // Extracting all parts
          
          // Split the suggestions into lines
          const lines = suggestions.split('\n').filter(line => line.trim() !== ''); // Filter out any empty lines
  
          // Clear loading message and display the response below the button
          responseDiv.innerHTML = lines.map(line => `<p>${line}</p>`).join('');
      } else {
          console.error('Yanıt beklenen formatta değil.');
          responseDiv.innerHTML = '<p>Yanıt beklenen formatta değil.</p>'; // Display error message
      }
  })    
  .catch(error => {
      console.error('API çağrısında hata:', error);
      responseDiv.innerHTML = '<p>API çağrısında hata oluştu.</p>'; // Display error message
  });
}