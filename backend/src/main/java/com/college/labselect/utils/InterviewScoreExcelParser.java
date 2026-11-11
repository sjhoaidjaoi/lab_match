package com.college.labselect.utils;

import cn.hutool.core.util.NumberUtil;
import cn.hutool.core.util.StrUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 面试评分导入 Excel（.xlsx）解析器，列顺序：学号、学习态度、逻辑思维、编程基础、时间投入、评语。
 */
@Component
@RequiredArgsConstructor
public class InterviewScoreExcelParser {

    private static final int COLUMN_COUNT = 6;

    private final StudentExcelParser studentExcelParser;

    /**
     * 解析评分导入文件，首行视为表头跳过。
     *
     * @param file Excel 文件
     * @return 评分数据行
     */
    public List<Row> parse(MultipartFile file) {
        List<StudentExcelParser.RawRow> rawRows = studentExcelParser.parseRaw(file, COLUMN_COUNT);
        List<Row> result = new ArrayList<>(rawRows.size());
        for (StudentExcelParser.RawRow rawRow : rawRows) {
            String[] values = rawRow.getValues();
            Row row = new Row();
            row.setRowNo(rawRow.getRowNo());
            row.setUserNo(values[0]);
            row.setAttitudeScore(toDecimal(values[1]));
            row.setLogicScore(toDecimal(values[2]));
            row.setProgrammingScore(toDecimal(values[3]));
            row.setTimeScore(toDecimal(values[4]));
            row.setComment(values[5]);
            result.add(row);
        }
        return result;
    }

    /**
     * 将单元格文本转换为两位小数。
     *
     * @param value 单元格文本
     * @return 分数，非数字返回 null
     */
    private BigDecimal toDecimal(String value) {
        String text = StrUtil.trim(value);
        if (StrUtil.isBlank(text) || !NumberUtil.isNumber(text)) {
            return null;
        }
        return new BigDecimal(text);
    }

    /**
     * 评分导入数据行。
     */
    @Data
    public static class Row {

        private Integer rowNo;
        private String userNo;
        private BigDecimal attitudeScore;
        private BigDecimal logicScore;
        private BigDecimal programmingScore;
        private BigDecimal timeScore;
        private String comment;
    }
}
