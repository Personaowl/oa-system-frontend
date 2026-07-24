<template>
  <div class="content-grid asset-page">
    <div class="asset-hero">
      <div>
        <span class="hero-kicker">ASSET CENTER</span>
        <h1>资产管理</h1>
        <p>办公用品申领、库存发放与固定资产全生命周期统一管理。</p>
      </div>
      <el-button :icon="Refresh" round :loading="loading" @click="loadAll">刷新数据</el-button>
    </div>

    <div class="asset-stats">
      <div v-for="item in statCards" :key="item.label" class="asset-stat" :class="item.tone">
        <el-icon><component :is="item.icon" /></el-icon>
        <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.hint }}</small></div>
      </div>
    </div>

    <section class="panel asset-panel">
      <el-tabs v-model="activeTab" class="asset-tabs">
        <el-tab-pane name="supplies">
          <template #label><span class="tab-label"><el-icon><Present /></el-icon>办公用品</span></template>
          <div class="section-head">
            <div><h2>办公用品库存</h2><p>员工可提交申领；主管审批后锁定库存，由管理员或 HR 确认发放。</p></div>
            <div class="tool-row">
              <el-input v-model="supplyKeyword" clearable placeholder="搜索用品名称 / 分类" :prefix-icon="Search" @keyup.enter="loadSupplies" />
              <el-button @click="loadSupplies">查询</el-button>
              <el-button v-if="overview.inventoryManager" type="primary" :icon="Plus" @click="openSupply()">新增用品</el-button>
            </div>
          </div>
          <el-table v-loading="loading" :data="supplies" stripe>
            <el-table-column prop="name" label="用品名称" min-width="160" />
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column label="当前库存" width="130"><template #default="{ row }"><strong :class="{ danger: row.lowStock }">{{ row.stockQuantity }} {{ row.unit }}</strong></template></el-table-column>
            <el-table-column prop="safetyStock" label="安全库存" width="110" />
            <el-table-column label="库存状态" width="110"><template #default="{ row }"><el-tag :type="row.status !== 1 ? 'info' : row.lowStock ? 'danger' : 'success'">{{ row.status !== 1 ? '已停用' : row.lowStock ? '库存预警' : '库存充足' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="160" fixed="right"><template #default="{ row }">
              <el-button v-if="row.status === 1" link type="primary" @click="openApply(row)">申领</el-button>
              <el-button v-if="overview.inventoryManager" link type="warning" @click="openSupply(row)">编辑库存</el-button>
            </template></el-table-column>
          </el-table>

          <div class="request-block">
            <div class="request-title"><div><h2>申领记录</h2><p>{{ overview.departmentReviewer ? '查看我的申领，以及当前权限范围内需要处理的申领单。' : '跟踪本人申请的审批和发放进度。' }}</p></div></div>
            <el-segmented v-model="requestScope" :options="requestScopeOptions" @change="loadRequests" />
            <el-table v-loading="requestLoading" :data="displayRequests" class="request-table">
              <el-table-column prop="requestNo" label="申领单号" min-width="200" />
              <el-table-column v-if="requestScope === 'reviewable'" prop="applicantName" label="申请人" width="110" />
              <el-table-column v-if="requestScope === 'reviewable'" prop="departmentName" label="部门" width="130" />
              <el-table-column prop="supplyName" label="用品" min-width="140" />
              <el-table-column label="数量" width="90"><template #default="{ row }">{{ row.quantity }} {{ row.supplyUnit }}</template></el-table-column>
              <el-table-column prop="reason" label="用途说明" min-width="180" show-overflow-tooltip />
              <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="requestStatus(row.status).type">{{ requestStatus(row.status).text }}</el-tag></template></el-table-column>
              <el-table-column label="申请时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
              <el-table-column label="操作" width="180" fixed="right"><template #default="{ row }">
                <template v-if="requestScope === 'reviewable'">
                  <el-button v-if="row.status === 'PENDING'" link type="success" @click="reviewRequest(row, 'APPROVE')">通过</el-button>
                  <el-button v-if="row.status === 'PENDING'" link type="danger" @click="reviewRequest(row, 'REJECT')">驳回</el-button>
                  <el-button v-if="overview.inventoryManager && row.status === 'APPROVED'" link type="primary" @click="issueRequest(row)">确认发放</el-button>
                </template>
                <el-button v-else-if="row.status === 'PENDING'" link type="danger" @click="cancelRequest(row)">撤销</el-button>
                <span v-else class="muted">{{ row.reviewComment || '—' }}</span>
              </template></el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane name="fixed">
          <template #label><span class="tab-label"><el-icon><Box /></el-icon>固定资产</span></template>
          <div class="section-head">
            <div><h2>{{ overview.inventoryManager ? '固定资产台账' : overview.departmentReviewer ? '部门固定资产' : '我的固定资产' }}</h2><p>电脑、显示器等资产按唯一编号登记，并记录领用人、位置和状态。</p></div>
            <div class="tool-row">
              <el-input v-model="assetKeyword" clearable placeholder="编号 / 名称 / 保管人" :prefix-icon="Search" @keyup.enter="loadFixedAssets" />
              <el-select v-model="assetStatusFilter" clearable placeholder="全部状态"><el-option v-for="item in assetStatuses" :key="item.value" :label="item.label" :value="item.value" /></el-select>
              <el-button @click="loadFixedAssets">查询</el-button>
              <el-button v-if="overview.inventoryManager" type="primary" :icon="Plus" @click="openAsset()">登记资产</el-button>
            </div>
          </div>
          <el-table v-loading="loading" :data="fixedAssets" stripe>
            <el-table-column prop="assetCode" label="资产编号" width="145" />
            <el-table-column prop="name" label="资产名称" min-width="150" />
            <el-table-column prop="category" label="分类" width="110" />
            <el-table-column prop="specification" label="规格型号" min-width="150" show-overflow-tooltip />
            <el-table-column label="资产原值" width="120" align="right"><template #default="{ row }">{{ money(row.originalValue) }}</template></el-table-column>
            <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="assetStatus(row.status).type">{{ assetStatus(row.status).text }}</el-tag></template></el-table-column>
            <el-table-column prop="custodianName" label="保管人" width="110"><template #default="{ row }">{{ row.custodianName || '—' }}</template></el-table-column>
            <el-table-column prop="departmentName" label="所属部门" width="130"><template #default="{ row }">{{ row.departmentName || '—' }}</template></el-table-column>
            <el-table-column prop="location" label="存放位置" min-width="140" />
            <el-table-column v-if="overview.inventoryManager" label="操作" width="210" fixed="right"><template #default="{ row }">
              <el-button link type="primary" @click="openAsset(row)">编辑</el-button>
              <el-button v-if="row.status === 'IDLE'" link type="success" @click="openAssign(row)">分配</el-button>
              <el-button v-if="row.status === 'IN_USE'" link type="warning" @click="returnAsset(row)">归还</el-button>
              <el-button v-if="row.status !== 'IN_USE'" link type="danger" @click="removeAsset(row)">删除</el-button>
            </template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-dialog v-model="supplyDialog" :title="supplyForm.id ? '编辑办公用品' : '新增办公用品'" width="500px" destroy-on-close>
      <el-form ref="supplyFormRef" :model="supplyForm" :rules="supplyRules" label-position="top" class="form-grid">
        <el-form-item label="用品名称" prop="name"><el-input v-model="supplyForm.name" maxlength="100" /></el-form-item>
        <el-form-item label="分类" prop="category"><el-input v-model="supplyForm.category" maxlength="64" /></el-form-item>
        <el-form-item label="计量单位" prop="unit"><el-input v-model="supplyForm.unit" placeholder="件 / 盒 / 包" /></el-form-item>
        <el-form-item label="当前库存" prop="stockQuantity"><el-input-number v-model="supplyForm.stockQuantity" :min="0" /></el-form-item>
        <el-form-item label="安全库存" prop="safetyStock"><el-input-number v-model="supplyForm.safetyStock" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="supplyForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="supplyDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="saveSupply">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="applyDialog" title="办公用品申领" width="460px" destroy-on-close>
      <div class="selected-card"><strong>{{ applyForm.supplyName }}</strong><span>可用库存 {{ applyForm.stockQuantity }} {{ applyForm.unit }}</span></div>
      <el-form ref="applyFormRef" :model="applyForm" :rules="applyRules" label-position="top">
        <el-form-item label="申领数量" prop="quantity"><el-input-number v-model="applyForm.quantity" :min="1" :max="applyForm.stockQuantity" /></el-form-item>
        <el-form-item label="用途说明" prop="reason"><el-input v-model="applyForm.reason" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="applyDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="submitApply">提交申领</el-button></template>
    </el-dialog>

    <el-dialog v-model="assetDialog" :title="assetForm.id ? '编辑固定资产' : '登记固定资产'" width="680px" destroy-on-close>
      <el-form ref="assetFormRef" :model="assetForm" :rules="assetRules" label-position="top" class="form-grid two-columns">
        <el-form-item label="资产编号" prop="assetCode"><el-input v-model="assetForm.assetCode" maxlength="64" /></el-form-item>
        <el-form-item label="资产名称" prop="name"><el-input v-model="assetForm.name" maxlength="100" /></el-form-item>
        <el-form-item label="分类" prop="category"><el-input v-model="assetForm.category" maxlength="64" /></el-form-item>
        <el-form-item label="规格型号"><el-input v-model="assetForm.specification" maxlength="255" /></el-form-item>
        <el-form-item label="购置日期"><el-date-picker v-model="assetForm.purchaseDate" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="资产原值" prop="originalValue"><el-input-number v-model="assetForm.originalValue" :min="0" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="当前状态"><el-select v-model="assetForm.status" style="width:100%"><el-option v-for="item in editableAssetStatuses" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="存放位置"><el-input v-model="assetForm.location" maxlength="128" /></el-form-item>
        <el-form-item class="span-two" label="备注"><el-input v-model="assetForm.remark" type="textarea" :rows="2" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="assetDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="saveAsset">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="assignDialog" title="分配固定资产" width="470px" destroy-on-close>
      <div class="selected-card"><strong>{{ assignForm.assetName }}</strong><span>{{ assignForm.assetCode }}</span></div>
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-position="top">
        <el-form-item label="领用人" prop="custodianId"><el-select v-model="assignForm.custodianId" filterable style="width:100%"><el-option v-for="user in users" :key="user.id" :label="`${user.displayName} · ${user.departmentName || '未分配部门'}`" :value="user.id" /></el-select></el-form-item>
        <el-form-item label="使用位置"><el-input v-model="assignForm.location" maxlength="128" placeholder="例如：研发部 A 区" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="assignDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="submitAssign">确认分配</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Box, CircleCheckFilled, Present, Plus, Refresh, Search, Tickets } from '@element-plus/icons-vue'
import { listUsers } from '../api/organization'
import { applySupply, assignFixedAsset, cancelSupplyRequest, createFixedAsset, createSupply, deleteFixedAsset, getAssetOverview, issueSupplyRequest, listFixedAssets, listMySupplyRequests, listReviewableSupplyRequests, listSupplies, returnFixedAsset, reviewSupplyRequest, updateFixedAsset, updateSupply } from '../api/assets'

const loading=ref(false), requestLoading=ref(false), saving=ref(false)
const activeTab=ref('supplies'), requestScope=ref('mine'), supplyKeyword=ref(''), assetKeyword=ref(''), assetStatusFilter=ref('')
const overview=reactive({ supplyKinds:0, lowStockKinds:0, pendingRequests:0, fixedAssetCount:0, inUseAssets:0, idleAssets:0, inventoryManager:false, departmentReviewer:false })
const supplies=ref([]), myRequests=ref([]), reviewableRequests=ref([]), fixedAssets=ref([]), users=ref([])
const supplyDialog=ref(false), applyDialog=ref(false), assetDialog=ref(false), assignDialog=ref(false)
const supplyFormRef=ref(), applyFormRef=ref(), assetFormRef=ref(), assignFormRef=ref()
const supplyForm=reactive({ id:null,name:'',category:'',unit:'件',stockQuantity:0,safetyStock:0,enabled:true,version:null })
const applyForm=reactive({ supplyId:null,supplyName:'',unit:'',stockQuantity:1,quantity:1,reason:'' })
const assetForm=reactive({ id:null,assetCode:'',name:'',category:'',specification:'',purchaseDate:'',originalValue:0,status:'IDLE',location:'总部资产库',remark:'',version:null })
const assignForm=reactive({ assetId:null,assetCode:'',assetName:'',custodianId:null,location:'',version:null })
const assetStatuses=[{value:'IDLE',label:'闲置'},{value:'IN_USE',label:'使用中'},{value:'REPAIR',label:'维修中'},{value:'SCRAPPED',label:'已报废'}]
const editableAssetStatuses=computed(()=>assetForm.status==='IN_USE'?assetStatuses.filter(item=>item.value==='IN_USE'):assetStatuses.filter(item=>item.value!=='IN_USE'))
const requestScopeOptions=computed(()=>overview.departmentReviewer?[{label:'我的申领',value:'mine'},{label:`审批中心（${overview.pendingRequests}）`,value:'reviewable'}]:[{label:'我的申领',value:'mine'}])
const displayRequests=computed(()=>requestScope.value==='reviewable'?reviewableRequests.value:myRequests.value)
const statCards=computed(()=>[
  {label:'用品种类',value:overview.supplyKinds,hint:`${overview.lowStockKinds} 项库存预警`,icon:Present,tone:'blue'},
  {label:overview.departmentReviewer?'待处理申领':'我的待审批',value:overview.pendingRequests,hint:'及时跟进申领进度',icon:Tickets,tone:'orange'},
  {label:'固定资产',value:overview.fixedAssetCount,hint:`${overview.inUseAssets} 件使用中`,icon:Box,tone:'purple'},
  {label:'闲置可用',value:overview.idleAssets,hint:'可继续分配使用',icon:CircleCheckFilled,tone:'green'}
])
const supplyRules={name:[{required:true,message:'请输入用品名称'}],category:[{required:true,message:'请输入分类'}],unit:[{required:true,message:'请输入单位'}],stockQuantity:[{required:true,message:'请输入库存'}],safetyStock:[{required:true,message:'请输入安全库存'}]}
const applyRules={quantity:[{required:true,message:'请输入数量'}],reason:[{required:true,message:'请填写用途说明'}]}
const assetRules={assetCode:[{required:true,message:'请输入资产编号'}],name:[{required:true,message:'请输入资产名称'}],category:[{required:true,message:'请输入分类'}],originalValue:[{required:true,message:'请输入资产原值'}]}
const assignRules={custodianId:[{required:true,message:'请选择领用人'}]}

async function loadAll(){ loading.value=true; try{ Object.assign(overview,await getAssetOverview()||{}); await Promise.all([loadSupplies(false),loadRequests(),loadFixedAssets(false)]); if(overview.inventoryManager&&!users.value.length){ const page=await listUsers({page:1,size:200}); users.value=page?.records||[] } }catch(e){ElMessage.error(e.message||'资产数据加载失败')}finally{loading.value=false} }
async function loadSupplies(show=true){ try{supplies.value=await listSupplies({keyword:supplyKeyword.value})||[]}catch(e){if(show)ElMessage.error(e.message)} }
async function loadRequests(){ requestLoading.value=true; try{ if(requestScope.value==='reviewable')reviewableRequests.value=await listReviewableSupplyRequests(false)||[]; else myRequests.value=await listMySupplyRequests()||[] }catch(e){ElMessage.error(e.message)}finally{requestLoading.value=false} }
async function loadFixedAssets(show=true){ try{fixedAssets.value=await listFixedAssets({keyword:assetKeyword.value,status:assetStatusFilter.value})||[]}catch(e){if(show)ElMessage.error(e.message)} }
function openSupply(row){Object.assign(supplyForm,row?{id:row.id,name:row.name,category:row.category,unit:row.unit,stockQuantity:row.stockQuantity,safetyStock:row.safetyStock,enabled:row.status===1,version:row.version}:{id:null,name:'',category:'',unit:'件',stockQuantity:0,safetyStock:0,enabled:true,version:null});supplyDialog.value=true}
async function saveSupply(){if(!await supplyFormRef.value?.validate().catch(()=>false))return;saving.value=true;try{const payload={name:supplyForm.name,category:supplyForm.category,unit:supplyForm.unit,stockQuantity:supplyForm.stockQuantity,safetyStock:supplyForm.safetyStock,status:supplyForm.enabled?1:0,version:supplyForm.version};supplyForm.id?await updateSupply(supplyForm.id,payload):await createSupply(payload);ElMessage.success('用品库存已保存');supplyDialog.value=false;await loadAll()}catch(e){ElMessage.error(e.message)}finally{saving.value=false}}
function openApply(row){Object.assign(applyForm,{supplyId:row.id,supplyName:row.name,unit:row.unit,stockQuantity:row.stockQuantity,quantity:1,reason:''});applyDialog.value=true}
async function submitApply(){if(!await applyFormRef.value?.validate().catch(()=>false))return;saving.value=true;try{await applySupply({supplyId:applyForm.supplyId,quantity:applyForm.quantity,reason:applyForm.reason});ElMessage.success('申领已提交');applyDialog.value=false;requestScope.value='mine';await loadAll()}catch(e){ElMessage.error(e.message)}finally{saving.value=false}}
async function reviewRequest(row,decision){try{let comment='';if(decision==='REJECT')comment=await ElMessageBox.prompt('请输入驳回原因','驳回申领',{inputValidator:v=>Boolean(v?.trim())||'请填写驳回原因'}).then(r=>r.value);else await ElMessageBox.confirm(`确认通过 ${row.applicantName} 的 ${row.supplyName} 申领吗？审批后将扣减库存。`,'审批确认',{type:'warning'});await reviewSupplyRequest(row.id,{decision,comment});ElMessage.success(decision==='APPROVE'?'已通过并扣减库存':'已驳回');await loadAll();requestScope.value='reviewable';await loadRequests()}catch(e){if(e!=='cancel'&&e!=='close')ElMessage.error(e.message||'审批失败')}}
async function issueRequest(row){try{await ElMessageBox.confirm('确认办公用品已实际交付给申请人？','确认发放',{type:'info'});await issueSupplyRequest(row.id);ElMessage.success('已确认发放');await loadAll();requestScope.value='reviewable';await loadRequests()}catch(e){if(e!=='cancel'&&e!=='close')ElMessage.error(e.message)}}
async function cancelRequest(row){try{await ElMessageBox.confirm('确认撤销该申领单？','撤销申领',{type:'warning'});await cancelSupplyRequest(row.id);ElMessage.success('申领已撤销');await loadAll()}catch(e){if(e!=='cancel'&&e!=='close')ElMessage.error(e.message)}}
function openAsset(row){Object.assign(assetForm,row?{id:row.id,assetCode:row.assetCode,name:row.name,category:row.category,specification:row.specification||'',purchaseDate:row.purchaseDate||'',originalValue:Number(row.originalValue||0),status:row.status,location:row.location||'',remark:row.remark||'',version:row.version}:{id:null,assetCode:'',name:'',category:'',specification:'',purchaseDate:'',originalValue:0,status:'IDLE',location:'总部资产库',remark:'',version:null});assetDialog.value=true}
async function saveAsset(){if(!await assetFormRef.value?.validate().catch(()=>false))return;saving.value=true;try{const payload={assetCode:assetForm.assetCode,name:assetForm.name,category:assetForm.category,specification:assetForm.specification||null,purchaseDate:assetForm.purchaseDate||null,originalValue:assetForm.originalValue,status:assetForm.status,location:assetForm.location||null,remark:assetForm.remark||null,version:assetForm.version};assetForm.id?await updateFixedAsset(assetForm.id,payload):await createFixedAsset(payload);ElMessage.success('固定资产已保存');assetDialog.value=false;await loadAll()}catch(e){ElMessage.error(e.message)}finally{saving.value=false}}
function openAssign(row){Object.assign(assignForm,{assetId:row.id,assetCode:row.assetCode,assetName:row.name,custodianId:null,location:row.location||'',version:row.version});assignDialog.value=true}
async function submitAssign(){if(!await assignFormRef.value?.validate().catch(()=>false))return;saving.value=true;try{await assignFixedAsset(assignForm.assetId,{custodianId:assignForm.custodianId,location:assignForm.location||null,version:assignForm.version});ElMessage.success('资产已分配');assignDialog.value=false;await loadAll()}catch(e){ElMessage.error(e.message)}finally{saving.value=false}}
async function returnAsset(row){try{const location=await ElMessageBox.prompt('请输入归还后的存放位置','资产归还',{inputValue:'总部资产库'}).then(r=>r.value);await returnFixedAsset(row.id,{location,version:row.version});ElMessage.success('资产已归还');await loadAll()}catch(e){if(e!=='cancel'&&e!=='close')ElMessage.error(e.message)}}
async function removeAsset(row){try{await ElMessageBox.confirm(`确认删除资产 ${row.assetCode}？`,'删除资产',{type:'warning'});await deleteFixedAsset(row.id);ElMessage.success('资产已删除');await loadAll()}catch(e){if(e!=='cancel'&&e!=='close')ElMessage.error(e.message)}}
function requestStatus(v){return {PENDING:{text:'待审批',type:'warning'},APPROVED:{text:'待发放',type:'primary'},REJECTED:{text:'已驳回',type:'danger'},ISSUED:{text:'已发放',type:'success'},CANCELLED:{text:'已撤销',type:'info'}}[v]||{text:v,type:'info'}}
function assetStatus(v){return {IDLE:{text:'闲置',type:'success'},IN_USE:{text:'使用中',type:'primary'},REPAIR:{text:'维修中',type:'warning'},SCRAPPED:{text:'已报废',type:'info'}}[v]||{text:v,type:'info'}}
function money(v){return Number(v||0).toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}
function formatTime(v){return v?String(v).replace('T',' ').slice(0,19):'—'}
onMounted(loadAll)
</script>

<style scoped>
.asset-page{gap:18px}.asset-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:28px 32px;border-radius:24px;background:linear-gradient(120deg,#eff6ff,#f7f3ff 55%,#ecfbf7);box-shadow:0 18px 40px rgba(63,84,140,.1)}.asset-hero:after{content:"";position:absolute;right:8%;top:-70px;width:220px;height:220px;border:36px solid rgba(99,102,241,.08);border-radius:50%}.asset-hero>*{position:relative;z-index:1}.hero-kicker{color:#6366f1;font-size:11px;font-weight:800;letter-spacing:.18em}.asset-hero h1{margin:8px 0 5px;font-size:30px}.asset-hero p,.section-head p,.request-title p{margin:0;color:var(--muted);font-size:13px}.asset-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.asset-stat{display:flex;align-items:center;gap:15px;padding:18px;border:1px solid rgba(148,163,184,.16);border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(70,83,120,.08)}.asset-stat>.el-icon{width:48px;height:48px;border-radius:15px;font-size:24px}.asset-stat div{display:flex;flex-direction:column}.asset-stat span,.asset-stat small{color:var(--muted);font-size:12px}.asset-stat strong{margin:2px 0;font-size:25px}.asset-stat.blue>.el-icon{color:#3977ed;background:#eaf2ff}.asset-stat.orange>.el-icon{color:#dc8b19;background:#fff4df}.asset-stat.purple>.el-icon{color:#7856db;background:#f1edff}.asset-stat.green>.el-icon{color:#16a579;background:#e9f9f3}.asset-panel{padding:8px 24px 24px}.asset-tabs :deep(.el-tabs__header){margin-bottom:20px}.asset-tabs :deep(.el-tabs__item){height:58px;padding:0 24px;font-weight:700}.tab-label{display:flex;align-items:center;gap:8px}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:18px}.section-head h2,.request-title h2{margin:0 0 5px;font-size:18px}.tool-row{display:flex;gap:8px;flex-wrap:wrap}.tool-row .el-input{width:220px}.tool-row .el-select{width:130px}.danger{color:#ef4444}.request-block{margin-top:26px;padding-top:22px;border-top:1px solid #edf0f5}.request-title{display:flex;justify-content:space-between;margin-bottom:12px}.request-table{margin-top:14px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.two-columns .span-two{grid-column:1/-1}.selected-card{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding:14px 16px;border-radius:12px;background:#f3f6fb}.selected-card span{color:var(--muted);font-size:12px}.muted{color:var(--muted);font-size:12px}@media(max-width:1100px){.asset-stats{grid-template-columns:repeat(2,1fr)}.section-head{flex-direction:column}.tool-row{width:100%}}@media(max-width:680px){.asset-hero{padding:22px;align-items:flex-start}.asset-stats{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.two-columns .span-two{grid-column:auto}.tool-row .el-input,.tool-row .el-select{width:100%}}
</style>
