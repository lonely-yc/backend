package com.genealogy.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.entity.Family;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface FamilyMapper extends BaseMapper<Family> {
}
