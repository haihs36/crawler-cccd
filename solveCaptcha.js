const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API_KEY = '83955f50c4b56be880e017666bd9e6bd';

async function getCaptchaImage(page) {
  try {
    // Tìm phần tử hình captcha
    const captchaElement = await page.$('img[src*="captcha.png"]');
    if (!captchaElement) {
      throw new Error("Không tìm thấy phần tử captcha.");
    }

    // Chụp ảnh captcha và chuyển thành dạng base64
    const captchaBuffer = await captchaElement.screenshot();
    // const base64Image = captchaBuffer.toString("base64");

    // Lưu ảnh captcha vào tệp tạm thời
    const tempImagePath = "temp_captcha.png";
    fs.writeFileSync(tempImagePath, captchaBuffer);

    return tempImagePath;
  } catch (error) {
    console.error("Lỗi khi lấy ảnh captcha:", error);
    return null;
  }
}

async function solveCaptcha(imagePath) {
  try {
    const formData = new FormData();
    formData.append("key", API_KEY);
    formData.append("method", "post");
    formData.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(`http://2captcha.com/in.php`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    const captchaId = response.data.split("|")[1];

    const startTime = Date.now();
    while (true) {
      const currentTime = Date.now();
      if (currentTime - startTime >= 60000) { // Timeout after 60 seconds
        throw new Error("Captcha không sẵn sàng sau quá trình chờ.");
      }

      const result = await axios.get(`http://2captcha.com/res.php`, {
        params: {
          key: API_KEY,
          action: "get",
          id: captchaId,
        },
      });

      if (result.data === "CAPCHA_NOT_READY") {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
      } else {
        return result.data.split("|")[1];
      }
    }
  } catch (error) {
    console.error("Lỗi khi giải captcha:", error);
    return null;
  }
}

module.exports = { getCaptchaImage, solveCaptcha };
