// processData.js
const cheerio = require("cheerio");

async function processData(page, cccd, captchaText) {
  try {
    
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
        if (row.length) {
          const data = {
            STT: row.eq(0).text().trim(),
            MaSoThue: row.eq(1).text().trim(),
            TenNguoiNopThue: row.eq(2).text().trim(),
            CoQuanThue: row.eq(3).text().trim(),
            SoCMT: row.eq(4).text().trim(),
            NgayThayDoiThongTin: row.eq(5).text().trim(),
            GhiChu: row.eq(6).text().trim(),
          };

          results.push(data);
        } 
      });

      return results;
  
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu:", error);
    throw new Error("Đã xảy ra lỗi khi xử lý dữ liệu.");
  }
}

module.exports = processData;
