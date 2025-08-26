const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Your Zenbooker API key
const ZENBOOKER_API_KEY = "zbk_z3srJyXoNOKsP1LT99TSJxK2-U3ibKHNRFzE2v8JKNZRNDkvsaSU2LhTt";

// ✅ GHL Webhook endpoint (this is the URL you’ll paste in GHL webhook)
app.post("/webhook/ghl", async (req, res) => {
  try {
    const data = req.body;

    // Extract useful fields from GHL webhook
    const {
      first_name,
      last_name,
      email,
      phone,
      timezone,
      calendar,
      location,
    } = data;

    // STEP 1: Check if customer already exists in Zenbooker
    let customer;
    try {
      const search = await axios.get(
        `https://api.zenbooker.com/v1/customers?email=${email}`,
        { headers: { Authorization: `Bearer ${ZENBOOKER_API_KEY}` } }
      );
      if (search.data && search.data.length > 0) {
        customer = search.data[0]; // existing customer
      }
    } catch (err) {
      console.log("Customer not found, will create new.");
    }

    // STEP 2: If no customer, create one
    if (!customer) {
      const createCustomer = await axios.post(
        "https://api.zenbooker.com/v1/customers",
        {
          first_name,
          last_name,
          email,
          phone,
          timezone,
          address: location?.fullAddress || "",
        },
        { headers: { Authorization: `Bearer ${ZENBOOKER_API_KEY}` } }
      );
      customer = createCustomer.data;
    }

    // STEP 3: Create a Job (appointment) in Zenbooker
    const createJob = await axios.post(
      "https://api.zenbooker.com/v1/jobs",
      {
        customer: customer.id,
        title: calendar.title || `${first_name} ${last_name} Appointment`,
        start_time: calendar.startTime,
        end_time: calendar.endTime,
        address: location?.fullAddress || "",
        status: "booked",
      },
      { headers: { Authorization: `Bearer ${ZENBOOKER_API_KEY}` } }
    );

    console.log("Job created/updated:", createJob.data);

    res.status(200).json({ success: true, message: "Synced with Zenbooker" });
  } catch (error) {
    console.error("Error syncing:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
