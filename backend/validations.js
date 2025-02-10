// validations.js

// Validate Email
const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

// Validate Sri Lankan Phone Number
const validatePhoneNumber = (phone) => {
    // Array of valid Sri Lankan service provider and district codes
    const validCodes = [
        "071", "072", "073", "074", "075", "076", "077", "078", "079","070", // Service Providers
        "035", "036", "037", "038", "039", "041", "042", "043", "044", "045", "046", "047", "048", "049", // District Codes
        "011", "012", "013", "014", "015", "016", "017", "018", "019"  // Other valid codes
    ];

    // Check if the first 3 digits are in the validCodes array
    const code = phone.slice(0, 3); // Get the first 3 digits

    if (!validCodes.includes(code)) {
        return false; // If the code is not valid, return false
    }

    // Check if the remaining 7 digits are numeric
    const remainingDigits = phone.slice(3); // Get the remaining 7 digits

    if (!/^[0-9]{7}$/.test(remainingDigits)) {
        return false; // If the remaining digits are not numeric, return false
    }

    return true; // If both conditions are met, the phone number is valid
};


module.exports = { validateEmail, validatePhoneNumber };
