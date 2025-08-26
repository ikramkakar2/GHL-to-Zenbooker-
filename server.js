const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Your Zenbooker API key
const ZENBOOKER_API_KEY = "zbk_XgmptCLsUI4Gu9KteOVo0fRy-UB3QkymAL6sejKL9E557CepFMj34d621";

// ✅ GHL Webhook endpoint
app.post("/webhook/ghl", async (req, res) => {
  try {
    const data = req.body;

    // Extract useful fields from GHL webhook
    const {
      first_name,
      last_name,
      email,
      phone,
      timezone = "America/Los_Angeles",
      calendar,
      location,
    } = data;

    // STEP 1: Check if customer exists
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
          name: `${first_name} ${last_name}`,
          phone: phone || "",
          email: email || "",
          accepts_sms: true,
          accepts_email: true,
          notes: [],
        },
        { headers: { Authorization: `Bearer ${ZENBOOKER_API_KEY}` } }
      );
      customer = createCustomer.data;
    }

    // STEP 3: Create a Job (appointment)
    const createJob = await axios.post(
      "https://api.zenbooker.com/v1/jobs",
      {
        start_date: calendar.startTime, // ISO string, required
        end_date: calendar.endTime,     // ISO string, required
        service_name: calendar.title || "Service Booking",
        timezone: timezone,
        territory: location?.territoryId || "", // optional if you have
        service_address: {
          line1: location?.line1 || location?.fullAddress || "",
          line2: location?.line2 || "",
          city: location?.city || "",
          state: location?.state || "",
          postal_code: location?.postalCode || "",
          country: location?.country || "USA",
          lat: location?.lat || null,
          lng: location?.lng || null,
        },
        estimated_duration_seconds:
          (new Date(calendar.endTime) - new Date(calendar.startTime)) / 1000,
        min_providers_required: 1,
        status: "scheduled",
        customer: {
          name: `${first_name} ${last_name}`,
          phone: phone || "",
          email: email || "",
        },
        invoice: { status: "draft" }, // optional but recommended
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


