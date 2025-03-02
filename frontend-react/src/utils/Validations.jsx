export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex for validating an email address
    return regex.test(email); // Returns true if email matches the regex, otherwise false
};

export const validateSriLankanPhone = (phone) => {
    const regex = /^(0(11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|51|52|54|55|57|63|65|66|67|81|91|94)|07(0|1|2|4|5|6|7|8))\d{7}$/;
    return regex.test(phone); 
};
