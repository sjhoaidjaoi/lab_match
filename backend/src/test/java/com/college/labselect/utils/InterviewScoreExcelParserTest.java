package com.college.labselect.utils;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 面试评分导入 Excel 解析器单元测试。
 */
class InterviewScoreExcelParserTest {

    private static final String SHEET_XML = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
              <sheetData>
                <row r="1">
                  <c r="A1" t="s"><v>0</v></c>
                  <c r="B1" t="s"><v>1</v></c>
                  <c r="C1" t="s"><v>2</v></c>
                  <c r="D1" t="s"><v>3</v></c>
                  <c r="E1" t="s"><v>4</v></c>
                  <c r="F1" t="s"><v>5</v></c>
                </row>
                <row r="2">
                  <c r="A2" t="s"><v>6</v></c>
                  <c r="B2"><v>90</v></c>
                  <c r="C2"><v>85</v></c>
                  <c r="D2"><v>88</v></c>
                  <c r="E2"><v>80</v></c>
                  <c r="F2" t="s"><v>7</v></c>
                </row>
              </sheetData>
            </worksheet>
            """;

    private static final String SHARED_STRINGS_XML = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
              <si><t>学号</t></si>
              <si><t>学习态度</t></si>
              <si><t>逻辑思维</t></si>
              <si><t>编程基础</t></si>
              <si><t>时间投入</t></si>
              <si><t>评语</t></si>
              <si><t>2022401</t></si>
              <si><t>基础扎实</t></si>
            </sst>
            """;

    private final InterviewScoreExcelParser parser =
            new InterviewScoreExcelParser(new StudentExcelParser());

    /**
     * 快乐路径：解析六列评分数据。
     */
    @Test
    void parse_validXlsx_shouldReturnScoreRow() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "scores.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buildXlsx());

        List<InterviewScoreExcelParser.Row> rows = parser.parse(file);

        assertThat(rows).hasSize(1);
        InterviewScoreExcelParser.Row row = rows.get(0);
        assertThat(row.getRowNo()).isEqualTo(2);
        assertThat(row.getUserNo()).isEqualTo("2022401");
        assertThat(row.getAttitudeScore()).isEqualByComparingTo("90");
        assertThat(row.getLogicScore()).isEqualByComparingTo("85");
        assertThat(row.getProgrammingScore()).isEqualByComparingTo("88");
        assertThat(row.getTimeScore()).isEqualByComparingTo("80");
        assertThat(row.getComment()).isEqualTo("基础扎实");
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
