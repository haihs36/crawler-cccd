const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const puppeteer = require("puppeteer");
const { getCaptchaImage, solveCaptcha } = require("./solveCaptcha");
const processData = require("./processData");
const xlsx = require("xlsx");
const fs = require("fs");

const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Thư mục lưu trữ tệp Excel đã tải lên
const uploadDir = "./uploads";

// Tạo thư mục lưu trữ nếu chưa tồn tại
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Cấu hình Multer để lưu trữ tệp Excel tải lên
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Trang chủ - trả về giao diện người dùng
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const URL = "https://tracuunnt.gdt.gov.vn/tcnnt/mstcn.jsp";

app.post("/import", upload.single("file"), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const results = [];

    var i = 0;
    for (const row of data) {
      await page.goto(URL);
      i++;
      const tempImagePath = await getCaptchaImage(page);
      const captchaText = await solveCaptcha(tempImagePath);
      const cccd = row.CCCD.toString();
      //proces data
      const processedData = await processData(page, cccd, captchaText);
      results.push({ cccd: cccd, result: processedData });
    }

    await browser.close();

    // Tạo một mảng chứa tất cả dữ liệu để lưu vào Excel
    const excelData = [];
    results.forEach((data) => {
      if (data.result.length === 0) {
        // Nếu result trống, thêm một mục với các trường cần thiết nhưng có giá trị là null
        excelData.push({
          STT: null,
          CCCD: data.cccd,
          MaSoThue: null,
          TenNguoiNopThue: null,
          CoQuanThue: null,
          SoCMT: null,
          NgayThayDoiThongTin: null,
          GhiChu: null,
        });
      } else {
        // Nếu có kết quả, thêm mỗi kết quả vào excelData
        data.result.forEach((resultItem) => {
          excelData.push({
            CCCD: data.cccd,
            MaSoThue: resultItem.MaSoThue,
            TenNguoiNopThue: resultItem.TenNguoiNopThue,
            CoQuanThue: resultItem.CoQuanThue,
            SoCMT: resultItem.SoCMT,
            NgayThayDoiThongTin: resultItem.NgayThayDoiThongTin,
            GhiChu: resultItem.GhiChu,
          });
        });
      }
    });

  // Tạo workbook và worksheet mới từ excelData
  const newWorkbook = xlsx.utils.book_new();
  const newWorksheet = xlsx.utils.json_to_sheet(excelData);
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "Results");

  // Lưu workbook vào tệp Excel
  const exportFilePath = `${uploadDir}/results.xlsx`;
  xlsx.writeFile(newWorkbook, exportFilePath);

    res.send(results);
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu import:", error);
    res.status(500).send("Đã xảy ra lỗi khi xử lý yêu cầu import.");
  }
});

app.get("/download-results", (req, res) => {
  const filePath = `${uploadDir}/results.xlsx`;
  res.download(filePath);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Máy chủ đã khởi động tại http://localhost:${port}`);
});
