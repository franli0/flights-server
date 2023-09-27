require('dotenv').config();

const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000; // You can choose any port you prefer

// Define your client credentials
const clientId = process.env.clientId
const clientSecret = process.env.clientSecret;

// Define the API URL
const apiUrl = 'https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport';

// Function to obtain a new access token
async function getNewAccessToken() {
  try {
    const tokenResponse = await axios.post(
      'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
      `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (tokenResponse.status === 200) {
      accessToken = tokenResponse.data.access_token;
      // Calculate token expiration time (one day from now)
      const expiresIn = tokenResponse.data.expires_in * 1000; // Convert to milliseconds
      tokenExpirationTime = Date.now() + expiresIn;
      console.log(`Access Token: ${accessToken}`);
      console.log(`Token Expiration Time: ${tokenExpirationTime}`)
    }
  } catch (error) {
    console.error('Error obtaining access token:', error);
  }
}

// Initial call to obtain the access token
getNewAccessToken();

// Middleware to check if the access token needs to be refreshed
app.use((req, res, next) => {
  if (!accessToken || Date.now() >= tokenExpirationTime) {
    // Access token is missing or expired, obtain a new one
    getNewAccessToken();
  }
  next();
});

app.get('/api/flights', async (req, res) => {
  try {
    // Extract query parameters from the request URL
    const { FlightDate, Ad, Airport } = req.query;

    if (!FlightDate || !Ad || !Airport) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    // Define query parameters
    const queryParams = {
      IsCargo: false,
      $filter: `date(FlightDate) eq ${FlightDate}`,
      $top: '30',
      $format: 'JSON',
    };

    // Make a GET request to the API with the access token
    const response = await axios.get(`${apiUrl}/${Ad}/${Airport}`, {
      params: queryParams,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Extract the desired data from the API response
    const flightData = response.data;

    // Extract specific fields from the response
    if (Ad === 'Arrive') {
      const extractedData = flightData.map((flight) => ({
        FlightNumber: flight.FlightNumber,
        AirlineID: flight.AirlineID,
        ScheduleDepartureTime: flight.ScheduleDepartureTime,
        EstimatedDepartureTime: flight.EstimatedDepartureTime,
        ArrivalAirportID: flight.ArrivalAirportID,
        DepartureRemark: flight.DepartureRemark,
        Terminal: flight.Terminal
      }));

      // Send the extracted data as JSON
      res.json(extractedData);
      console.log('Get Arrival Flights Data Successfully')
    } else if (Ad === 'Depart') {
      const extractedData = flightData.map((flight) => ({
        FlightNumber: flight.FlightNumber,
        AirlineID: flight.AirlineID,
        ScheduleArrivalTime: flight.ScheduleArrivalTime,
        EstimatedArrivalTime: flight.EstimatedArrivalTime,
        DepartureAirportID: flight.DepartureAirportID,
        ArrivalRemark: flight.ArrivalRemark,
        Terminal: flight.Terminal
      }));

      // Send the extracted data as JSON
      res.json(extractedData);
      console.log('Get Departure Flights Data Successfully')
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(port, '192.168.11.11', () => {
  console.log(`Server is running on port ${port}`);
});
