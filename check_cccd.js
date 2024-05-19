const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs");
const FormData = require("form-data");
const API_KEY = "83955f50c4b56be880e017666bd9e6bd";
const URL = "https://tracuunnt.gdt.gov.vn/tcnnt/mstcn.jsp";

async function getCaptchaImage(page) {
  try {
    // Tìm phần tử hình captcha
    const captchaElement = await page.$('img[src*="captcha.png"]');
    if (!captchaElement) {
      throw new Error("Không tìm thấy phần tử captcha.");
    }

    // Chụp ảnh captcha và chuyển thành dạng base64
    const captchaBuffer = await captchaElement.screenshot();
    const base64Image = captchaBuffer.toString("base64");

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

  while (true) {
    const result = await axios.get(`http://2captcha.com/res.php`, {
      params: {
        key: API_KEY,
        action: "get",
        id: captchaId,
      },
    });

    if (result.data === "CAPCHA_NOT_READY") {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      return result.data.split("|")[1];
    }
  }
}

// Giả lập mảng CCCD từ danh sách bạn cung cấp
const cccdArray = [
  "77096000485",
  "381477711",
  "371468599",
  "245318137",
  "79093003179",
];

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const cccd of cccdArray) {
    await page.goto(URL);

    // Get the captcha image and solve it
    const captchaBase64 = await getCaptchaImage(page);
    const captchaText = await solveCaptcha(captchaBase64);

    // Check if cccd and captchaText are valid before typing
    if (typeof cccd === "string" && typeof captchaText === "string") {
      // Enter the required data into the form fields
      await page.type('input[name="cmt2"]', cccd);
      await page.type('input[name="captcha"]', captchaText);

      // Submit the form
      await page.click('input[onclick="gotoPage(1);"]');
      await page.waitForNavigation();

      // Extract the result from the response
      const content = await page.content();
      const $ = cheerio.load(content);
      const results = [];

      $("table.ta_border tr").each((index, element) => {
        if (index === 0 || index === $("table.ta_border tr").length - 1) {
          return; // Bỏ qua hàng đầu tiên và hàng cuối cùng
        }

        const row = $(element).find("td");
        if (row.length && row.length === 7) {
          const result = {
            STT: row.eq(0).text().trim(),
            MaSoThue: row.eq(1).text().trim(),
            TenNguoiNopThue: row.eq(2).text().trim(),
            CoQuanThue: row.eq(3).text().trim(),
            SoCMT: row.eq(4).text().trim(),
            NgayThayDoiThongTin: row.eq(5).text().trim(),
            GhiChu: row.eq(6).text().trim(),
          };
          results.push(result);
        }
      });

      console.log(`CCCD: ${cccd} : Results: `, results);
    } else {
      console.error(`CCCD: ${cccd} not filter`);
    }
  }

  await browser.close();
}

main().catch(console.error);
