package com.college.labselect.utils;

import cn.hutool.core.util.StrUtil;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * 轻量 xlsx 生成器，仅依赖 JDK，使用内联字符串写出单工作表。
 */
public final class SimpleXlsxWriter {

    private static final String CONTENT_TYPES = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
              <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
              <Default Extension="xml" ContentType="application/xml"/>
              <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
              <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
            </Types>
            """;

    private static final String ROOT_RELS = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
            </Relationships>
            """;

    private static final String WORKBOOK = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
            </workbook>
            """;

    private static final String WORKBOOK_RELS = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
            </Relationships>
            """;

    private SimpleXlsxWriter() {
    }

    /**
     * 生成单工作表 xlsx。
     *
     * @param headers 表头
     * @param rows    数据行
     * @return xlsx 字节流
     */
    public static byte[] write(List<String> headers, List<List<String>> rows) {
        StringBuilder sheet = new StringBuilder();
        sheet.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
                .append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">")
                .append("<sheetData>");
        appendRow(sheet, 1, headers);
        int rowNo = 2;
        for (List<String> row : rows) {
            appendRow(sheet, rowNo++, row);
        }
        sheet.append("</sheetData></worksheet>");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            putEntry(zip, "[Content_Types].xml", CONTENT_TYPES);
            putEntry(zip, "_rels/.rels", ROOT_RELS);
            putEntry(zip, "xl/workbook.xml", WORKBOOK);
            putEntry(zip, "xl/_rels/workbook.xml.rels", WORKBOOK_RELS);
            putEntry(zip, "xl/worksheets/sheet1.xml", sheet.toString());
        } catch (Exception exception) {
            throw new IllegalStateException("生成 Excel 失败", exception);
        }
        return output.toByteArray();
    }

    /**
     * 追加一行内联字符串单元格。
     *
     * @param sheet  工作表 XML
     * @param rowNo  行号
     * @param values 单元格值
     */
    private static void appendRow(StringBuilder sheet, int rowNo, List<String> values) {
        sheet.append("<row r=\"").append(rowNo).append("\">");
        for (int index = 0; index < values.size(); index++) {
            String reference = columnName(index) + rowNo;
            String value = StrUtil.nullToEmpty(values.get(index));
            sheet.append("<c r=\"").append(reference).append("\" t=\"inlineStr\"><is><t>")
                    .append(escapeXml(value))
                    .append("</t></is></c>");
        }
        sheet.append("</row>");
    }

    /**
     * 列下标转列名。
     *
     * @param index 从 0 开始的列下标
     * @return 列名，如 A、B、AA
     */
    private static String columnName(int index) {
        StringBuilder name = new StringBuilder();
        int value = index;
        while (value >= 0) {
            name.insert(0, (char) ('A' + value % 26));
            value = value / 26 - 1;
        }
        return name.toString();
    }

    /**
     * 转义 XML 特殊字符。
     *
     * @param value 原始文本
     * @return 转义文本
     */
    private static String escapeXml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    /**
     * 写入 zip 条目。
     *
     * @param zip     zip 输出流
     * @param name    条目名
     * @param content 内容
     * @throws Exception 写入异常
     */
    private static void putEntry(ZipOutputStream zip, String name, String content) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
