package com.genealogy.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.entity.OperateLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 操作日志Mapper
 */
@Mapper
public interface OperateLogMapper extends BaseMapper<OperateLog> {
}
