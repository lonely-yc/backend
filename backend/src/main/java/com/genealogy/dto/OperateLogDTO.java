package com.genealogy.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 操作日志DTO
 */
@Data
public class OperateLogDTO {

    private Long id;

    private String operateType;

    private String operateTypeDesc;

    private Long userId;

    private String userName;

    private Long targetId;

    private String targetName;

    private String targetType;

    private Long familyId;

    private String detail;

    private LocalDateTime createdAt;

    /**
     * 分页查询参数
     */
    @Data
    public static class QueryParams {
        private Long familyId;
        private String operateType;
        private String targetType;
        private Long userId;
        private String keyword;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private Integer pageNum = 1;
        private Integer pageSize = 20;
    }

    /**
     * 分页返回结果
     */
    @Data
    public static class PageResult {
        private List<OperateLogDTO> records;
        private Long total;
        private Integer pageNum;
        private Integer pageSize;
    }
}
