from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QLabel, QDoubleSpinBox, QHeaderView, QDialog, QPushButton, QDialogButtonBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QColor
from server.app.models.deck import ClassType
import numpy as np
# 梯度表界面
# 职业颜色映射
CLASS_COLORS = {
    ClassType.ELF: QColor(200, 230, 200),      # 柔和绿
    ClassType.ROYAL: QColor(255, 240, 200),    # 柔和黄
    ClassType.RUNE: QColor(200, 220, 255),     # 柔和蓝
    ClassType.DRAGON: QColor(220, 200, 180),   # 柔和棕
    ClassType.BISHOP: QColor(240, 240, 240),   # 柔和白/浅灰
    ClassType.NIGHTMARE: QColor(230, 200, 200), # 柔和暗红
    ClassType.UMA_MUSUME: QColor(200, 230, 255), # 柔和天蓝
    ClassType.IDOLMASTER: QColor(255, 220, 240), # 柔和粉
    ClassType.VANGUARD: QColor(200, 200, 200)   # 柔和黑/深灰
}

class EnvironmentOffsetDialog(QDialog):
    def __init__(self, deck_manager, parent=None):
        super().__init__(parent)
        self.deck_manager = deck_manager
        self.setWindowTitle("编辑环境偏移值")
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 添加说明文本
        description = QLabel("环境因强度以外的要素变化时调整。数字越大表示使用率越高。")
        description.setWordWrap(True)
        layout.addWidget(description)
        
        # 创建表格
        self.table = QTableWidget()
        self.table.setColumnCount(2)
        self.table.setHorizontalHeaderLabels(["卡组名称", "环境偏移值"])
        
        # 设置表格样式
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        
        # 填充数据
        self.table.setRowCount(len(self.deck_manager.get_all_decks()))
        for i, deck in enumerate(self.deck_manager.get_all_decks()):
            # 卡组名称
            name_item = QTableWidgetItem(deck.name)
            name_item.setBackground(CLASS_COLORS[deck.class_type])
            self.table.setItem(i, 0, name_item)
            
            # 环境偏移值
            offset_spinbox = QDoubleSpinBox()
            offset_spinbox.setRange(-5, 5)
            offset_spinbox.setSingleStep(1)
            offset_spinbox.setValue(deck.environment_offset if hasattr(deck, 'environment_offset') else 0)
            self.table.setCellWidget(i, 1, offset_spinbox)
        
        layout.addWidget(self.table)
        
        # 添加按钮
        button_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        button_box.accepted.connect(self.accept)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
        
    def get_environment_offsets(self):
        offsets = {}
        for i in range(self.table.rowCount()):
            deck_name = self.table.item(i, 0).text()
            offset = self.table.cellWidget(i, 1).value()
            offsets[deck_name] = offset
        return offsets

class WinRateTableTab(QWidget):
    data_changed = pyqtSignal()
    
    def __init__(self, data_manager):
        super().__init__()
        self.data_manager = data_manager
        
        # 创建主布局
        self.main_layout = QVBoxLayout(self)
        
        # 创建参数控制区域
        self.create_parameter_controls()
        
        # 创建表格
        self.create_table()
        
        # 初始刷新
        self.refresh()
        
    def create_parameter_controls(self):
        """创建参数控制区域"""
        param_layout = QHBoxLayout()
        
        # 添加敏感度参数控制
        sensitivity_label = QLabel("环境功利指数 T:")
        self.sensitivity_spinbox = QDoubleSpinBox()
        self.sensitivity_spinbox.setRange(1.0, 100.0)
        self.sensitivity_spinbox.setSingleStep(1.0)
        self.sensitivity_spinbox.setValue(30.0)
        self.sensitivity_spinbox.valueChanged.connect(self.refresh)
        
        # 添加编辑环境偏移值按钮
        self.edit_offset_button = QPushButton("编辑环境偏移值")
        self.edit_offset_button.clicked.connect(self.edit_environment_offsets)
        
        param_layout.addWidget(sensitivity_label)
        param_layout.addWidget(self.sensitivity_spinbox)
        param_layout.addStretch()
        param_layout.addWidget(self.edit_offset_button)
        
        self.main_layout.addLayout(param_layout)
        
    def edit_environment_offsets(self):
        """打开编辑环境偏移值对话框"""
        dialog = EnvironmentOffsetDialog(self.data_manager.deck_manager, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            offsets = dialog.get_environment_offsets()
            # 更新卡组的环境偏移值
            for deck in self.data_manager.deck_manager.get_all_decks():
                if deck.name in offsets:
                    deck.environment_offset = offsets[deck.name]
            self.refresh()

    def create_table(self):
        """创建数据表格"""
        self.table = QTableWidget()
        self.table.setColumnCount(3)
        self.table.setHorizontalHeaderLabels([
            "卡组名称", "平均胜率", "最终加权胜率"
        ])
        
        # 设置表格样式
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        
        self.main_layout.addWidget(self.table)
        
    def calculate_average_win_rate(self, deck_name, matchup_manager):
        """计算卡组的平均胜率"""
        total_win_rate = 0
        count = 0
        
        for deck_a, deck_b, matchup_data in matchup_manager.get_all_matchups():
            if deck_a == deck_name:
                total_win_rate += matchup_manager.get_win_rate(deck_a, deck_b)
                count += 1
            elif deck_b == deck_name:
                total_win_rate += matchup_manager.get_win_rate(deck_b, deck_a)
                count += 1
                
        return total_win_rate / count if count > 0 else 0
        
    def calculate_weighted_win_rate(self, deck_name, matchup_manager, sensitivity, previous_win_rates=None, divisor=500):
        """
        计算卡组的加权胜率
        
        Args:
            deck_name: 卡组名称
            matchup_manager: 对战管理器
            sensitivity: 敏感度参数
            previous_win_rates: 上一次加权胜率字典，如果为None则使用平均胜率
            divisor: 权重计算中的除数，默认为500
            
        Returns:
            float: 加权胜率
        """
        # 如果没有提供上一次的胜率，则使用平均胜率
        if previous_win_rates is None:
            previous_win_rates = {}
            for deck in self.data_manager.deck_manager.get_all_decks():
                previous_win_rates[deck.name] = self.calculate_average_win_rate(deck.name, matchup_manager)
        
        # 计算加权胜率
        total_weight = 0
        weighted_sum = 0
        
        for deck_a, deck_b, matchup_data in matchup_manager.get_all_matchups():
            if deck_a == deck_name:
                opponent = deck_b
                win_rate = matchup_manager.get_win_rate(deck_a, deck_b)
            elif deck_b == deck_name:
                opponent = deck_a
                win_rate = matchup_manager.get_win_rate(deck_b, deck_a)
            else:
                continue
                
            # 检查对手卡组是否存在于当前卡组列表中
            if opponent not in previous_win_rates:
                continue
                
            # 获取对手卡组的环境偏移值
            opponent_deck = next((d for d in self.data_manager.deck_manager.get_all_decks() if d.name == opponent), None)
            opponent_offset = getattr(opponent_deck, 'environment_offset', 0)
            
            # 计算权重，考虑环境偏移值
            base_weight = np.exp(previous_win_rates[opponent] * (sensitivity * sensitivity)/divisor)
            environment_factor = (opponent_offset) /10 + 1
            weight = base_weight * environment_factor
            
            total_weight += weight
            weighted_sum += weight * win_rate
            
        return weighted_sum / total_weight if total_weight > 0 else 0
        


    def calculate_final_weighted_win_rate(self, deck_name, matchup_manager, sensitivity, initial_win_rates):
        """
        计算卡组的最终加权胜率
        
        Args:
            deck_name: 卡组名称
            matchup_manager: 对战管理器
            sensitivity: 敏感度参数
            initial_win_rates: 初始胜率字典（平均胜率）
            
        Returns:
            float: 最终加权胜率
        """
        current_win_rates = initial_win_rates.copy()
        iteration = 0
        damping_factor = 0.1  # 阻尼系数
        
        while True:
            iteration += 1
            new_win_rates = {}
            
            # 计算新一轮的加权胜率
            for deck in self.data_manager.deck_manager.get_all_decks():
                raw_new_rate = self.calculate_weighted_win_rate(
                    deck.name,
                    matchup_manager,
                    sensitivity,
                    current_win_rates,
                    100
                )
                # 使用阻尼系数更新胜率
                new_win_rates[deck.name] = current_win_rates[deck.name] * damping_factor + raw_new_rate * (1 - damping_factor)
            
            # 检查所有卡组的胜率变动是否都不大于1%
            max_change = max(
                abs(new_win_rates[deck.name] - current_win_rates[deck.name])
                for deck in self.data_manager.deck_manager.get_all_decks()
            )
            
            # 如果满足条件或达到最大迭代次数，返回结果
            if max_change <= 0.01 or iteration >= 100:
                return new_win_rates[deck_name]
            
            # 否则继续迭代
            current_win_rates = new_win_rates
        
    def refresh(self):
        """刷新表格数据"""
        # 清空表格
        self.table.setRowCount(0)
        
        # 获取当前敏感度参数
        sensitivity = self.sensitivity_spinbox.value()
        
        # 计算所有卡组的平均胜率
        win_rates = [{}]  # 第0次（平均胜率）
        for deck in self.data_manager.deck_manager.get_all_decks():
            win_rates[0][deck.name] = self.calculate_average_win_rate(deck.name, self.data_manager.matchup_manager)
        
        # 计算最终加权胜率
        final_win_rates = {}
        for deck in self.data_manager.deck_manager.get_all_decks():
            final_win_rates[deck.name] = self.calculate_final_weighted_win_rate(
                deck.name,
                self.data_manager.matchup_manager,
                sensitivity,
                win_rates[0]  # 使用平均胜率（第0次加权胜率）作为初始值
            )
        
        # 填充数据
        for deck in self.data_manager.deck_manager.get_all_decks():
            row = self.table.rowCount()
            self.table.insertRow(row)
            
            # 卡组名称
            name_item = QTableWidgetItem(deck.name)
            name_item.setBackground(CLASS_COLORS[deck.class_type])
            self.table.setItem(row, 0, name_item)
            
            # 平均胜率
            avg_win_rate = win_rates[0][deck.name]
            avg_item = QTableWidgetItem(f"{avg_win_rate:.2%}")
            avg_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            if avg_win_rate > 0.5:
                avg_item.setBackground(QColor(200, 255, 200))  # 绿色
            elif avg_win_rate < 0.5:
                avg_item.setBackground(QColor(255, 200, 200))  # 红色
            else:
                avg_item.setBackground(QColor(240, 240, 240))  # 灰色
            self.table.setItem(row, 1, avg_item)
            
            # 最终加权胜率
            final_win_rate = final_win_rates[deck.name]
            final_item = QTableWidgetItem(f"{final_win_rate:.2%}")
            final_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            if final_win_rate > 0.5:
                final_item.setBackground(QColor(200, 255, 200))  # 绿色
            elif final_win_rate < 0.5:
                final_item.setBackground(QColor(255, 200, 200))  # 红色
            else:
                final_item.setBackground(QColor(240, 240, 240))  # 灰色
            self.table.setItem(row, 2, final_item)
            
        # 按最终加权胜率排序
        self.table.sortItems(2, Qt.SortOrder.DescendingOrder) 