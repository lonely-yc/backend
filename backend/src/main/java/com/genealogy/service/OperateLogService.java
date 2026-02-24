package com.genealogy.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.genealogy.dto.OperateLogDTO;
import com.genealogy.entity.OperateLog;
import com.genealogy.mapper.OperateLogMapper;
import com.genealogy.mapper.PersonMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 操作日志服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OperateLogService extends ServiceImpl<OperateLogMapper, OperateLog> {

    private final PersonMapper personMapper;

    /**
     * 记录操作日志
     */
    public void log(String operateType, Long userId, String userName,
                    Long targetId, String targetName, String targetType,
                    Long familyId, String detail) {
        OperateLog log = new OperateLog();
        log.setOperateType(operateType);
        log.setOperateTypeDesc(OperateLog.OperateType.getDesc(operateType));
        log.setUserId(userId);
        log.setUserName(userName);
        log.setTargetId(targetId);
        log.setTargetName(targetName);
        log.setTargetType(targetType);
        log.setFamilyId(familyId);
        log.setDetail(detail);
        save(log);
    }

    /**
     * 分页查询操作日志
     */
    public OperateLogDTO.PageResult pageQuery(OperateLogDTO.QueryParams params) {
        Page<OperateLog> page = new Page<>(params.getPageNum(), params.getPageSize());

        LambdaQueryWrapper<OperateLog> qw = new LambdaQueryWrapper<>();

        // 家族筛选
        if (params.getFamilyId() != null) {
            qw.eq(OperateLog::getFamilyId, params.getFamilyId());
        }

        // 操作类型筛选
        if (StringUtils.hasText(params.getOperateType())) {
            qw.eq(OperateLog::getOperateType, params.getOperateType());
        }

        // 目标类型筛选
        if (StringUtils.hasText(params.getTargetType())) {
            qw.eq(OperateLog::getTargetType, params.getTargetType());
        }

        // 用户筛选
        if (params.getUserId() != null) {
            qw.eq(OperateLog::getUserId, params.getUserId());
        }

        // 时间范围筛选
        if (params.getStartTime() != null) {
            qw.ge(OperateLog::getCreatedAt, params.getStartTime());
        }
        if (params.getEndTime() != null) {
            qw.le(OperateLog::getCreatedAt, params.getEndTime());
        }

        // 关键词搜索（目标名称）
        if (StringUtils.hasText(params.getKeyword())) {
            qw.like(OperateLog::getTargetName, params.getKeyword());
        }

        qw.orderByDesc(OperateLog::getCreatedAt);

        Page<OperateLog> resultPage = page(page, qw);

        List<OperateLogDTO> records = resultPage.getRecords().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        OperateLogDTO.PageResult result = new OperateLogDTO.PageResult();
        result.setRecords(records);
        result.setTotal(resultPage.getTotal());
        result.setPageNum((int) resultPage.getCurrent());
        result.setPageSize((int) resultPage.getSize());

        return result;
    }

    /**
     * 查询某人物的所有操作历史
     */
    public List<OperateLogDTO> getByTargetId(Long targetId) {
        List<OperateLog> logs = list(new LambdaQueryWrapper<OperateLog>()
                .eq(OperateLog::getTargetId, targetId)
                .orderByDesc(OperateLog::getCreatedAt));
        return logs.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * 查询某家族的所有操作日志
     */
    public List<OperateLogDTO> getByFamilyId(Long familyId) {
        List<OperateLog> logs = list(new LambdaQueryWrapper<OperateLog>()
                .eq(OperateLog::getFamilyId, familyId)
                .orderByDesc(OperateLog::getCreatedAt)
                .last("LIMIT 100")); // 最多返回100条
        return logs.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * 根据ID查询单条日志
     */
    public OperateLogDTO findById(Long id) {
        OperateLog log = getBaseMapper().selectById(id);
        if (log == null) return null;
        return toDTO(log);
    }

    /**
     * 转换为DTO
     */
    private OperateLogDTO toDTO(OperateLog log) {
        OperateLogDTO dto = new OperateLogDTO();
        dto.setId(log.getId());
        dto.setOperateType(log.getOperateType());
        dto.setOperateTypeDesc(log.getOperateTypeDesc());
        dto.setUserId(log.getUserId());
        dto.setUserName(log.getUserName());
        dto.setTargetId(log.getTargetId());
        dto.setTargetName(log.getTargetName());
        dto.setTargetType(log.getTargetType());
        dto.setFamilyId(log.getFamilyId());
        dto.setDetail(log.getDetail());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }

    /**
     * 解析详情JSON为Map
     */
    public Map<String, Object> parseDetail(String detail) {
        if (!StringUtils.hasText(detail)) {
            return Collections.emptyMap();
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(detail, Map.class);
        } catch (Exception e) {
            log.warn("解析日志详情失败: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
