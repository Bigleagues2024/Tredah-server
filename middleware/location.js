import axios from "axios";
import useragent from "useragent";

export const getLocation = async (req, res, next) => {
  const agent = useragent.parse(req.headers["user-agent"]);
  const deviceInfo = agent.toString();
  const deviceType = deviceInfo.split('/')[1]


  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress;

  // Strip IPv6 prefix if exists (e.g., ::ffff:192.0.2.128)
  if (ip?.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  // Localhost or invalid IP fallback
  if (!ip || ip === "::1" || ip === "127.0.0.1") {
    req.location = {
      country: "NG",
      region: "Lagos",
      city: "Lagos",
    };
    return next();
  }

  try {
    const { data } = await axios.get(`https://ipinfo.io/${ip}/json`);
    console.log("locationInfo", data.city, data.region, data.country);

    req.location = {
      deviceInfo,
      deviceType,
      country: data.country,
      region: data.region,
      city: data.city,
    };
  } catch (err) {
    console.error("Error fetching location:", err.message);
    req.location = { country: "", region: "", city: "" };
  }

  return next();
};
