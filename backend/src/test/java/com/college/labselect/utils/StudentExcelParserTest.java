package com.college.labselect.utils;

import com.college.labselect.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * 学生导入 Excel 解析器单元测试。
 */
class StudentExcelParserTest {

    private static final String SHEET_XML = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
              <sheetData>
                <row r="1">
                  <c r="A1" t="s"><v>0</v></c>
                  <c r="B1" t="s"><v>1</v></c>
                </row>
                <row r="2">
                  <c r="A2" t="s"><v>2</v></c>
                  <c r="B2" t="s"><v>3</v></c>
                  <c r="C2" t="s"><v>4</v></c>
                  <c r="D2" t="s"><v>5</v></c>
                  <c r="E2"><v>2022</v></c>
                  <c r="F2"><v>13800000001</v></c>
                  <c r="G2" t="s"><v>6</v></c>
                </row>
              </sheetData>
            </worksheet>
            """;

    private static final String SHARED_STRINGS_XML = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
              <si><t>学号</t></si>
              <si><t>姓名</t></si>
              <si><t>20229999</t></si>
              <si><t>测试生</t></si>
              <si><t>计算机学院</t></si>
              <si><t>软件工程</t></si>
              <si><t>test@example.com</t></si>
            </sst>
            """;

    private final StudentExcelParser parser = new StudentExcelParser();

    /**
     * 快乐路径：解析合法 xlsx，跳过表头并映射七列。
     */
    @Test
    void parse_validXlsx_shouldReturnDataRows() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buildXlsx());

        List<StudentExcelParser.Row> rows = parser.parse(file);

        assertThat(rows).hasSize(1);
        StudentExcelParser.Row row = rows.get(0);
        assertThat(row.getRowNo()).isEqualTo(2);
        assertThat(row.getUserNo()).isEqualTo("20229999");
        assertThat(row.getRealName()).isEqualTo("测试生");
        assertThat(row.getCollege()).isEqualTo("计算机学院");
        assertThat(row.getMajor()).isEqualTo("软件工程");
        assertThat(row.getGrade()).isEqualTo("2022");
        assertThat(row.getPhone()).isEqualTo("13800000001");
        assertThat(row.getEmail()).isEqualTo("test@example.com");
    }

    /**
     * 边界：非 xlsx 文件返回 400001。
     */
    @Test
    void parse_nonXlsx_shouldThrow400001() {
        MockMultipartFile file = new MockMultipartFile("file", "students.csv",
                "text/csv", "20229999,测试生".getBytes(StandardCharsets.UTF_8));

        BusinessException exception = catchThrowableOfType(
                () -> parser.parse(file), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    private byte[] buildXlsx() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            putEntry(zip, "xl/worksheets/sheet1.xml", SHEET_XML);
            putEntry(zip, "xl/sharedStrings.xml", SHARED_STRINGS_XML);
        }
        return output.toByteArray();
    }

    private void putEntry(ZipOutputStream zip, String name, String content) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
