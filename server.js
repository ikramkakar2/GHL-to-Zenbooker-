const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Use environment variable for security
const ZENBOOKER_API_KEY = "zbk_XgmptCLsUI4Gu9KteOVo0fRy-UB3QkymAL6sejKL9E557CepFMj34d621";

// POST endpoint to receive GHL webhook
app.post("/webhook/ghl", async (req, res) => {
  const data = req.body;
  const {
    first_name,
    last_name,
    email,
    phone,
    timezone = "America/Los_Angeles",
    calendar,
    location,
  } = data;

  try {
    let customer;

    // STEP 1: Check if customer exists
    try {
      const search = await axios.get(
        `https://api.zenbooker.com/v1/customers?email=${email}`,
        { headers: { Authorization: `Bearer ${ZENBOOKER_API_KEY}` } }
      );

      if (search.data && search.data.length > 0) {
        customer = search.data[0]; // Existing customer
      }
    } catch (err) {
      console.log("Customer not found, will create new.");
    }

    // STEP 2: Create customer if not found
    if (!customer) {
      try {
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
        console.log("Customer created:", customer);
      } catch (err) {
        console.error("Error creating customer:", err.response?.data || err.message);
        return res.status(400).json({ success: false, error: err.response?.data || err.message });
      }
    }

    // STEP 3: Create Job (appointment)
    try {
      const createJob = await axios.post(
        "https://api.zenbooker.com/v1/jobs",
        {
          start_date: calendar.startTime,
          end_date: calendar.endTime,
          service_name: calendar.title || "Service Booking",
          timezone,
          territory: location?.territoryId || "",
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
            email,
          },
          invoice: { status: "draft" },
        },
        { headers: { Authorization: `Bearer ${ZENBOOKER_API_KEY}` } }
      );

      console.log("Job created:", createJob.data);
      return res.status(200).json({ success: true, job: createJob.data });
    } catch (err) {
      console.error("Error creating job:", err.response?.data || err.message);
      return res.status(400).json({ success: false, error: err.response?.data || err.message });
    }

  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
