-- =============================================
-- 迁徙地图功能 - 数据库迁移脚本
-- 执行此脚本更新现有数据库
-- =============================================

USE genealogy;

-- 为 t_event 表添加地理位置字段
ALTER TABLE t_event
  ADD COLUMN location VARCHAR(255) DEFAULT NULL COMMENT '地点名称' AFTER description,
  ADD COLUMN latitude DOUBLE DEFAULT NULL COMMENT '纬度' AFTER location,
  ADD COLUMN longitude DOUBLE DEFAULT NULL COMMENT '经度' AFTER latitude;

-- 验证字段已添加
-- SELECT * FROM t_event LIMIT 1;
